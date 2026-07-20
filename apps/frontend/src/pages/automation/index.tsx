import { ChatMain } from "@/components/chat/chat-main";
import { toMobileConfigPayload } from "@/components/chat/platform-selector";
import { MobileDevicesProvider } from "@/contexts/mobile-devices-context";
import { getApiDataToken } from "@/lib/api-data/token";
import { mapBridgeKindToAgentRuntime } from "@/lib/api/api-data-runs-api";
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

  const handleSend = useCallback(() => {
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
          text: "Sesi API Data hilang — logout lalu login ulang sebelum submit job.",
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
    dispatch(setLastSubmittedJobId(id));
    dispatch(setWorkerState("busy"));

    const attachments = promptAttachments.length ? [...promptAttachments] : undefined;
    const baseSnapshot = promptBases.map((b) => ({
      id: b.id,
      label: b.label,
      icon: b.icon,
      variant: b.variant,
      path: promptShortcutPath(b.id),
    }));

    dispatch(
      appendChatLine({
        id: `u-${id}`,
        role: "user",
        text: main,
        jobPlatform: platform,
        promptBases: baseSnapshot.length ? baseSnapshot : undefined,
        attachments,
      })
    );
    dispatch(
      upsertAgentChatLine({
        id,
        role: "agent",
        text: "Mengirim ke Worker…",
        status: "queued",
        progress: 0,
      })
    );

    setPrompt("");
    setPromptBases([]);
    setPromptAttachments([]);

    const model =
      selectedModel || bridge?.defaultModel || bridge?.models?.[0]?.id || "";
    const promptText = main || "Gunakan lampiran sesuai instruksi di prompt user.";
    const mobileConfigPayload =
      platform === "mobile" || platform === "hybrid"
        ? toMobileConfigPayload(mobileConfig)
        : undefined;

    // Synthetic runId until full api-data createAgentRun is wired with real client.
    const runId = Date.now();
    dispatch(
      upsertAgentChatLine({
        id,
        role: "agent",
        text: `runId ${runId} — mengirim ke Worker…`,
        status: "queued",
        progress: 0,
        runId,
      })
    );

    ws.sendUserPrompt({
      id,
      bridgeId: selectedBridgeId,
      agentRuntime: mapBridgeKindToAgentRuntime(bridge?.bridgeKind),
      text: promptText,
      promptBasePaths: basePaths.length ? basePaths : undefined,
      mainPrompt: main || undefined,
      strategy: "automation_human_strategy",
      model,
      attachments,
      platform,
      mobileConfig: mobileConfigPayload,
      runId,
      apiDataToken,
    });
  }, [
    prompt,
    promptBases,
    promptAttachments,
    selectedBridgeId,
    bridges,
    getClient,
    dispatch,
    selectedModel,
    platform,
    mobileConfig,
  ]);

  const handleCancel = useCallback(() => {
    if (!lastSubmittedJobId || !selectedBridgeId || workerState !== "busy") return;
    getClient()?.cancelJob({ id: lastSubmittedJobId, bridgeId: selectedBridgeId });
  }, [lastSubmittedJobId, selectedBridgeId, workerState, getClient]);

  return (
    <MobileDevicesProvider enabled={connectionState === "connected"}>
      <div className="flex h-full min-h-0 flex-col">
        <ChatMain
          bridges={bridges}
          prompt={prompt}
          promptBases={promptBases}
          promptAttachments={promptAttachments}
          platform={platform}
          mobileConfig={mobileConfig}
          workerState={workerState}
          connectionState={connectionState}
          selectedBridgeId={selectedBridgeId}
          selectedModel={selectedModel}
          chatLines={chatLines}
          onPromptChange={setPrompt}
          onAddPromptBase={handleAddPromptBase}
          onRemovePromptBase={handleRemovePromptBase}
          onApplyMainPrompt={handleApplyMainPrompt}
          onPromptAttachmentsChange={setPromptAttachments}
          onSelectBridge={(id) => dispatch(setSelectedBridgeId(id))}
          onSelectModel={(id) => dispatch(setSelectedModel(id))}
          onPlatformChange={(p) => dispatch(setPlatform(p))}
          onMobileConfigChange={setMobileConfig}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      </div>
    </MobileDevicesProvider>
  );
}
