import { ChatMain } from "@/components/chat/chat-main";
import { toMobileConfigPayload } from "@/components/chat/platform-selector";
import { MobileDevicesProvider } from "@/contexts/mobile-devices-context";
import { getApiDataToken } from "@/lib/api-data/token";
import { mapBridgeKindToAgentRuntime } from "@/lib/api/api-data-runs-api";
import {
  approveMission,
  cancelMission,
  createMission,
  missionItemsToTestCases,
  patchMission,
  planMissionTodos,
  putMissionItems,
  readyMission,
  seedMissionFromSuite,
  type AgentMission,
  type MissionItem,
  type PlannedMissionItem,
} from "@/lib/api/api-data-missions-api";
import type { PromptAttachment } from "@/lib/utils/prompt-attachment";
import type { AppliedPromptShortcut } from "@/lib/utils/prompt-compose";
import { promptShortcutPath } from "@/lib/utils/prompt-compose";
import type { PromptShortcut } from "@/lib/prompt-shortcuts";
import { useAutomationWs } from "@/lib/ws/AutomationWsProvider";
import {
  appendChatLine,
  setLastSubmittedJobId,
  setWorkerState,
  upsertAgentChatLine,
} from "@/redux/automationSlice";
import {
  setSelectedBridgeId,
  setSelectedModel,
  setPlatform,
} from "@/redux/connectionSlice";
import type { RootState } from "@/redux/store";
import type { MobileConfig } from "@knitto/shared";
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

function jobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function draftItem(partial?: Partial<MissionItem>): MissionItem {
  return {
    itemId: 0,
    missionId: 0,
    itemOrder: 0,
    kind: "todo",
    title: partial?.title ?? "Todo baru",
    body: partial?.body ?? "",
    testCaseId: null,
    requiresEvidence: false,
    status: "PENDING",
    ...partial,
  };
}

function plannedToMissionItems(items: PlannedMissionItem[]): MissionItem[] {
  return items.map((item, index) =>
    draftItem({
      itemOrder: index,
      kind: item.kind,
      title: item.title,
      body: item.body ?? item.title,
      requiresEvidence:
        item.kind === "checkpoint" ? true : Boolean(item.requiresEvidence),
    })
  );
}

export default function AutomationPage() {
  const dispatch = useDispatch();
  const { getClient } = useAutomationWs();
  const {
    connectionState,
    bridges,
    selectedBridgeId,
    selectedModel,
    platform,
  } = useSelector((s: RootState) => s.connection);
  const { chatLines, workerState, lastSubmittedJobId } = useSelector(
    (s: RootState) => s.automation
  );

  const [prompt, setPrompt] = useState("");
  const [promptBases, setPromptBases] = useState<AppliedPromptShortcut[]>([]);
  const [promptAttachments, setPromptAttachments] = useState<PromptAttachment[]>([]);
  const [mobileConfig, setMobileConfig] = useState<MobileConfig>({ appPackage: "" });
  const [composerKey, setComposerKey] = useState(0);
  const [activeMission, setActiveMission] = useState<AgentMission | null>(null);
  const [suiteIdDraft, setSuiteIdDraft] = useState("");
  const [missionBusy, setMissionBusy] = useState(false);

  const handleAddPromptBase = useCallback((shortcut: PromptShortcut, filledText: string) => {
    if (!filledText.trim()) return;
    const entry: AppliedPromptShortcut = {
      id: shortcut.id,
      label: shortcut.label,
      icon: shortcut.icon,
      variant: shortcut.variant,
      filledText,
    };
    setPromptBases((prev) => {
      const without = prev.filter((b) => b.id !== shortcut.id);
      return [...without, entry];
    });
  }, []);

  const handleRemovePromptBase = useCallback((id: string) => {
    setPromptBases((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleApplyMainPrompt = useCallback((filledText: string) => {
    setPrompt(filledText);
  }, []);

  const persistItems = useCallback(
    async (missionId: number, items: MissionItem[]) => {
      const token = getApiDataToken();
      if (!token) throw new Error("Login API Data dulu.");
      return putMissionItems(
        token,
        missionId,
        items.map((item) => ({
          kind: item.kind === "checkpoint" ? "checkpoint" : "todo",
          title: item.title.trim() || "Todo",
          body: item.body,
          testCaseId: item.testCaseId,
          requiresEvidence: item.requiresEvidence,
        }))
      );
    },
    []
  );

  const runLlmPlan = useCallback(
    async (opts: {
      missionId: number;
      intentText: string;
      bridgeId: string;
      model: string;
      promptBaseLabels: string[];
      attachmentNames: string[];
    }) => {
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: "Memanggil LLM untuk menyusun todos mission…",
        })
      );
      const planned = await planMissionTodos({
        bridgeId: opts.bridgeId,
        model: opts.model,
        intentText: opts.intentText,
        platform,
        promptBaseLabels: opts.promptBaseLabels,
        attachmentNames: opts.attachmentNames,
      });
      const withItems = await persistItems(
        opts.missionId,
        plannedToMissionItems(planned.items)
      );
      setActiveMission(withItems);
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: `Mission #${withItems.missionId} DRAFT — ${withItems.items.length} todos dari LLM. Review, Ready, lalu Approve & Run.`,
        })
      );
      return withItems;
    },
    [dispatch, persistItems, platform]
  );

  /** Composer primary: create DRAFT mission then LLM-plan todos. */
  const handleComposeMission = useCallback(() => {
    const main = prompt.trim();
    const basePaths = promptBases.map((b) => promptShortcutPath(b.id));
    if ((!main && !promptAttachments.length && !basePaths.length) || !selectedBridgeId) {
      return;
    }

    const bridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
    const apiDataToken = getApiDataToken();
    if (!apiDataToken) {
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: "Sesi API Data hilang — logout lalu login ulang sebelum susun mission.",
        })
      );
      return;
    }

    const model =
      selectedModel || bridge?.defaultModel || bridge?.models?.[0]?.id || "";
    if (!model) {
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: "Pilih model dulu sebelum Susun mission.",
        })
      );
      return;
    }

    const agentRuntime = mapBridgeKindToAgentRuntime(bridge?.bridgeKind);
    const mobileConfigPayload =
      platform === "mobile" || platform === "hybrid"
        ? toMobileConfigPayload(mobileConfig)
        : undefined;
    const mediaIds = promptAttachments
      .map((a) => a.mediaId)
      .filter((id): id is number => id != null);
    const intentText =
      main ||
      (promptBases.length
        ? `Jalankan template: ${promptBases.map((b) => b.label).join(", ")}`
        : "Automation dari lampiran");
    const promptBaseLabels = promptBases.map((b) => b.label);
    const attachmentNames = promptAttachments.map((a) => a.name);

    setMissionBusy(true);
    void (async () => {
      try {
        if (
          activeMission &&
          (activeMission.status === "DRAFT" || activeMission.status === "READY")
        ) {
          const updated = await patchMission(apiDataToken, activeMission.missionId, {
            title: intentText.slice(0, 80) || activeMission.title,
            intentText,
            agentRuntime,
            platform,
            model,
            mobileConfig: mobileConfigPayload ?? null,
            promptBasePaths: basePaths,
            attachmentMediaIds: mediaIds,
          });
          await runLlmPlan({
            missionId: updated.missionId,
            intentText,
            bridgeId: selectedBridgeId,
            model,
            promptBaseLabels,
            attachmentNames,
          });
          setPrompt("");
          setPromptBases([]);
          setPromptAttachments([]);
          setComposerKey((k) => k + 1);
          return;
        }

        const mission = await createMission(apiDataToken, {
          title: intentText.slice(0, 80) || "Untitled mission",
          intentText,
          agentRuntime,
          platform,
          model,
          mobileConfig: mobileConfigPayload ?? null,
          promptBasePaths: basePaths,
          attachmentMediaIds: mediaIds,
        });

        setActiveMission({ ...mission, items: [] });
        await runLlmPlan({
          missionId: mission.missionId,
          intentText,
          bridgeId: selectedBridgeId,
          model,
          promptBaseLabels,
          attachmentNames,
        });

        setPrompt("");
        setPromptBases([]);
        setPromptAttachments([]);
        setComposerKey((k) => k + 1);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Gagal susun/plan mission: ${message}`,
          })
        );
      } finally {
        setMissionBusy(false);
      }
    })();
  }, [
    prompt,
    promptBases,
    promptAttachments,
    selectedBridgeId,
    bridges,
    selectedModel,
    platform,
    mobileConfig,
    activeMission,
    runLlmPlan,
    dispatch,
  ]);

  const handleMissionReplan = useCallback(() => {
    if (!activeMission || !selectedBridgeId) return;
    if (activeMission.status !== "DRAFT" && activeMission.status !== "READY") return;

    const bridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
    const model =
      selectedModel ||
      activeMission.model ||
      bridge?.defaultModel ||
      bridge?.models?.[0]?.id ||
      "";
    if (!model) {
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: "Pilih model dulu sebelum Re-plan.",
        })
      );
      return;
    }

    const intentText =
      activeMission.intentText?.trim() ||
      activeMission.title ||
      "Automation mission";

    setMissionBusy(true);
    void runLlmPlan({
      missionId: activeMission.missionId,
      intentText,
      bridgeId: selectedBridgeId,
      model,
      promptBaseLabels: [],
      attachmentNames: [],
    })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Gagal Re-plan: ${message}`,
          })
        );
      })
      .finally(() => setMissionBusy(false));
  }, [
    activeMission,
    selectedBridgeId,
    bridges,
    selectedModel,
    runLlmPlan,
    dispatch,
  ]);

  const handleMissionItemsChange = useCallback(
    (items: MissionItem[]) => {
      if (!activeMission) return;
      setActiveMission({ ...activeMission, items });
      const token = getApiDataToken();
      if (!token) return;
      setMissionBusy(true);
      void persistItems(activeMission.missionId, items)
        .then((updated) => setActiveMission(updated))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          dispatch(
            appendChatLine({
              id: `sys-${Date.now()}`,
              role: "system",
              text: `Gagal simpan items: ${message}`,
            })
          );
        })
        .finally(() => setMissionBusy(false));
    },
    [activeMission, persistItems, dispatch]
  );

  const handleMissionAddTodo = useCallback(() => {
    if (!activeMission) return;
    handleMissionItemsChange([
      ...activeMission.items,
      draftItem({ title: `Todo ${(activeMission.items?.length ?? 0) + 1}` }),
    ]);
  }, [activeMission, handleMissionItemsChange]);

  const handleMissionReady = useCallback(() => {
    const token = getApiDataToken();
    if (!token || !activeMission) return;
    setMissionBusy(true);
    void readyMission(token, activeMission.missionId)
      .then((updated) => {
        setActiveMission(updated);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Mission #${updated.missionId} READY — Approve & Run untuk eksekusi.`,
          })
        );
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Gagal ready: ${message}`,
          })
        );
      })
      .finally(() => setMissionBusy(false));
  }, [activeMission, dispatch]);

  const handleMissionSeed = useCallback(() => {
    const token = getApiDataToken();
    if (!token || !activeMission) return;
    const suiteId = suiteIdDraft.trim() ? Number(suiteIdDraft) : null;
    if (suiteId != null && !Number.isFinite(suiteId)) {
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: "Suite id tidak valid.",
        })
      );
      return;
    }
    setMissionBusy(true);
    void seedMissionFromSuite(token, activeMission.missionId, suiteId)
      .then((updated) => {
        setActiveMission(updated);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Mission #${updated.missionId} di-seed (${updated.items.length} items).`,
          })
        );
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Gagal seed suite: ${message}`,
          })
        );
      })
      .finally(() => setMissionBusy(false));
  }, [activeMission, suiteIdDraft, dispatch]);

  const handleMissionCancel = useCallback(() => {
    const token = getApiDataToken();
    if (!token || !activeMission) return;

    const jobId = activeMission.agentJobId ?? lastSubmittedJobId;
    if (jobId && selectedBridgeId && workerState === "busy") {
      getClient()?.cancelJob({ id: jobId, bridgeId: selectedBridgeId });
    }

    setMissionBusy(true);
    void cancelMission(token, activeMission.missionId)
      .then(() => {
        setActiveMission(null);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Mission #${activeMission.missionId} CANCELLED.`,
          })
        );
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        dispatch(
          appendChatLine({
            id: `sys-${Date.now()}`,
            role: "system",
            text: `Gagal cancel mission: ${message}`,
          })
        );
      })
      .finally(() => setMissionBusy(false));
  }, [activeMission, dispatch, getClient, lastSubmittedJobId, selectedBridgeId, workerState]);

  const handleMissionApprove = useCallback(() => {
    if (!activeMission || !selectedBridgeId) return;

    const bridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
    const apiDataToken = getApiDataToken();
    if (!apiDataToken) {
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: "Sesi API Data hilang — login ulang sebelum approve.",
        })
      );
      return;
    }

    const ws = getClient();
    if (!ws) {
      dispatch(
        appendChatLine({
          id: `sys-${Date.now()}`,
          role: "system",
          text: "WebSocket belum siap — Connect dulu dari settings / refresh halaman.",
        })
      );
      return;
    }

    const id = jobId();
    const model =
      selectedModel || bridge?.defaultModel || bridge?.models?.[0]?.id || "";
    const agentRuntime = mapBridgeKindToAgentRuntime(bridge?.bridgeKind);
    const mobileConfigPayload =
      platform === "mobile" || platform === "hybrid"
        ? toMobileConfigPayload(mobileConfig)
        : undefined;
    const tcPlatform = platform === "mobile" ? "mobile" : "browser";
    const promptText =
      activeMission.intentText?.trim() ||
      activeMission.title ||
      "Jalankan mission sesuai todos.";

    dispatch(setLastSubmittedJobId(id));
    dispatch(setWorkerState("busy"));
    dispatch(
      appendChatLine({
        id: `u-${id}`,
        role: "user",
        text: `[Mission #${activeMission.missionId}] ${promptText}`,
        jobPlatform: platform,
      })
    );
    dispatch(
      upsertAgentChatLine({
        id,
        role: "agent",
        text: "Approve mission → create run…",
        status: "queued",
        progress: 0,
      })
    );

    setMissionBusy(true);
    void (async () => {
      try {
        // Persist latest local edits before approve
        if (activeMission.status === "DRAFT" || activeMission.status === "READY") {
          await persistItems(activeMission.missionId, activeMission.items);
          if (activeMission.status === "DRAFT") {
            await readyMission(apiDataToken, activeMission.missionId);
          }
        }

        const approved = await approveMission(
          apiDataToken,
          activeMission.missionId,
          id
        );
        setActiveMission(approved.mission);

        const testCases = missionItemsToTestCases(
          approved.mission.items ?? activeMission.items,
          tcPlatform
        );

        dispatch(
          upsertAgentChatLine({
            id,
            role: "agent",
            text: `runId ${approved.runId} — mengirim ke Worker…`,
            status: "queued",
            progress: 0,
            runId: approved.runId,
          })
        );

        ws.sendUserPrompt({
          id,
          bridgeId: selectedBridgeId,
          agentRuntime,
          text: promptText,
          promptBasePaths: approved.mission.promptBasePaths?.length
            ? approved.mission.promptBasePaths
            : undefined,
          mainPrompt: promptText,
          strategy: "automation_human_strategy",
          model,
          platform,
          mobileConfig: mobileConfigPayload,
          testCases,
          runId: approved.runId,
          missionId: approved.mission.missionId,
          apiDataToken,
        });
      } catch (error) {
        dispatch(setWorkerState("idle"));
        dispatch(setLastSubmittedJobId(null));
        const message = error instanceof Error ? error.message : String(error);
        dispatch(
          upsertAgentChatLine({
            id,
            role: "agent",
            text: `Gagal approve/run: ${message}`,
            status: "error",
          })
        );
      } finally {
        setMissionBusy(false);
      }
    })();
  }, [
    activeMission,
    selectedBridgeId,
    bridges,
    getClient,
    dispatch,
    selectedModel,
    platform,
    mobileConfig,
    persistItems,
  ]);

  const handleCancel = useCallback(() => {
    if (!lastSubmittedJobId || !selectedBridgeId || workerState !== "busy") return;
    getClient()?.cancelJob({ id: lastSubmittedJobId, bridgeId: selectedBridgeId });
  }, [lastSubmittedJobId, selectedBridgeId, workerState, getClient]);

  const uiBusy = workerState === "busy" || missionBusy;

  return (
    <MobileDevicesProvider enabled={platform === "mobile" || platform === "hybrid"}>
      <div className="flex h-full min-h-0 flex-col">
        <ChatMain
          bridges={bridges}
          prompt={prompt}
          promptBases={promptBases}
          promptAttachments={promptAttachments}
          platform={platform}
          mobileConfig={mobileConfig}
          workerState={uiBusy ? "busy" : "idle"}
          connectionState={connectionState}
          selectedBridgeId={selectedBridgeId}
          selectedModel={selectedModel}
          chatLines={chatLines}
          composerKey={composerKey}
          activeMission={activeMission}
          suiteIdDraft={suiteIdDraft}
          onSuiteIdDraftChange={setSuiteIdDraft}
          onMissionItemsChange={handleMissionItemsChange}
          onMissionReady={handleMissionReady}
          onMissionApprove={handleMissionApprove}
          onMissionCancel={handleMissionCancel}
          onMissionSeed={handleMissionSeed}
          onMissionAddTodo={handleMissionAddTodo}
          onMissionReplan={handleMissionReplan}
          onPromptChange={setPrompt}
          onAddPromptBase={handleAddPromptBase}
          onRemovePromptBase={handleRemovePromptBase}
          onApplyMainPrompt={handleApplyMainPrompt}
          onPromptAttachmentsChange={setPromptAttachments}
          onSelectBridge={(id) => dispatch(setSelectedBridgeId(id))}
          onSelectModel={(id) => dispatch(setSelectedModel(id))}
          onPlatformChange={(p) => dispatch(setPlatform(p))}
          onMobileConfigChange={setMobileConfig}
          onSend={handleComposeMission}
          onCancel={handleCancel}
          lastSubmittedJobId={lastSubmittedJobId}
        />
      </div>
    </MobileDevicesProvider>
  );
}
