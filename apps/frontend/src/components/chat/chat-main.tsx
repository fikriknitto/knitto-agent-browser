import type { AutomationPlatform, MobileConfig } from "@knitto/shared";
import type { PromptAttachment } from "@/lib/utils/prompt-attachment";
import type { AppliedPromptShortcut } from "@/lib/utils/prompt-compose";
import type { PromptShortcut } from "@/lib/prompt-shortcuts";
import type { BridgeSummary, ChatLine, ConnectionState } from "@/lib/types";
import type { AgentMission, MissionItem } from "@/lib/api/api-data-missions-api";
import { findActiveMissionJobLine } from "@/lib/utils/mission-run-progress";
import { Settings2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AutomationConfigPanel } from "./automation-config-panel";
import { ChatHistory } from "./job-progress";
import { LeftPanelTabs, type LeftPanelTab } from "./left-panel-tabs";
import { MissionBoard, MissionBoardEmpty } from "./mission-board";
import { PromptEditor } from "./prompt-editor";
import { Button } from "@/components/chat/ui";

type ChatMainProps = {
  bridges: BridgeSummary[];
  prompt: string;
  promptBases: AppliedPromptShortcut[];
  promptAttachments: PromptAttachment[];
  platform: AutomationPlatform;
  mobileConfig: MobileConfig;
  workerState: "idle" | "busy";
  connectionState: ConnectionState;
  selectedBridgeId: string;
  selectedModel: string;
  chatLines: ChatLine[];
  composerKey?: string | number;
  activeMission: AgentMission | null;
  suiteIdDraft: string;
  onSuiteIdDraftChange: (value: string) => void;
  onMissionItemsChange: (items: MissionItem[]) => void;
  onMissionReady: () => void;
  onMissionApprove: () => void;
  onMissionCancel: () => void;
  onMissionSeed: () => void;
  onMissionAddTodo: () => void;
  onMissionReplan: () => void;
  onPromptChange: (value: string) => void;
  onAddPromptBase: (shortcut: PromptShortcut, filledText: string) => void;
  onRemovePromptBase: (id: string) => void;
  onApplyMainPrompt: (filledText: string) => void;
  onPromptAttachmentsChange: (attachments: PromptAttachment[]) => void;
  onSelectBridge: (id: string) => void;
  onSelectModel: (id: string) => void;
  onPlatformChange: (platform: AutomationPlatform) => void;
  onMobileConfigChange: (config: MobileConfig) => void;
  onSend: () => void;
  onCancel: () => void;
  onOpenHistory?: (runId: number) => void;
  lastSubmittedJobId?: string | null;
};

export function ChatMain({
  bridges,
  prompt,
  promptBases,
  promptAttachments,
  platform,
  mobileConfig,
  workerState,
  connectionState,
  selectedBridgeId,
  selectedModel,
  chatLines,
  composerKey = 0,
  activeMission,
  suiteIdDraft,
  onSuiteIdDraftChange,
  onMissionItemsChange,
  onMissionReady,
  onMissionApprove,
  onMissionCancel,
  onMissionSeed,
  onMissionAddTodo,
  onMissionReplan,
  onPromptChange,
  onAddPromptBase,
  onRemovePromptBase,
  onApplyMainPrompt,
  onPromptAttachmentsChange,
  onSelectBridge,
  onSelectModel,
  onPlatformChange,
  onMobileConfigChange,
  onSend,
  onCancel,
  onOpenHistory,
  lastSubmittedJobId,
}: ChatMainProps) {
  const hasHistory = chatLines.length > 0;
  const [configOpen, setConfigOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftPanelTab>("config");
  const prevMissionIdRef = useRef<number | null>(null);
  const busy = workerState === "busy";
  const composingMission = Boolean(
    activeMission &&
      (activeMission.status === "DRAFT" || activeMission.status === "READY")
  );

  useEffect(() => {
    const id = activeMission?.missionId ?? null;
    if (id != null && id !== prevMissionIdRef.current) {
      setLeftTab("mission");
    }
    prevMissionIdRef.current = id;
  }, [activeMission?.missionId]);

  useEffect(() => {
    if (!configOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfigOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [configOpen]);

  const configPanelProps = {
    bridges,
    connectionState,
    selectedBridgeId,
    selectedModel,
    platform,
    mobileConfig,
    promptBases,
    disabled: busy,
    onSelectBridge,
    onSelectModel,
    onPlatformChange,
    onMobileConfigChange,
    onAddPromptBase,
    onRemovePromptBase,
    onApplyMainPrompt,
  } as const;

  const runProgressLine = useMemo(
    () => findActiveMissionJobLine(chatLines, activeMission, lastSubmittedJobId),
    [chatLines, activeMission, lastSubmittedJobId]
  );

  const missionBoard =
    activeMission != null ? (
      <MissionBoard
        layout="sidebar"
        mission={activeMission}
        busy={busy}
        suiteIdDraft={suiteIdDraft}
        onSuiteIdDraftChange={onSuiteIdDraftChange}
        onItemsChange={onMissionItemsChange}
        onReady={onMissionReady}
        onApprove={onMissionApprove}
        onCancelMission={onMissionCancel}
        onSeedFromSuite={onMissionSeed}
        onAddTodo={onMissionAddTodo}
        onReplan={onMissionReplan}
        runProgressLine={runProgressLine}
        isRunning={workerState === "busy" && activeMission.status === "APPROVED"}
      />
    ) : (
      <MissionBoardEmpty />
    );

  const leftPane =
    leftTab === "config" ? (
      <AutomationConfigPanel {...configPanelProps} pane />
    ) : (
      missionBoard
    );

  return (
    <main className="flex h-[calc(100dvh-3.25rem)] p-3 sm:p-4">
      <div className="automation-console">
        <aside
          className="automation-config-panel hidden md:flex"
          aria-label="Automation sidebar"
        >
          <LeftPanelTabs
            value={leftTab}
            onChange={setLeftTab}
            missionActive={Boolean(activeMission)}
          />
          {!configOpen ? leftPane : null}
        </aside>

        <div className="automation-workspace">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10 md:hidden">
            <span className="text-sm font-semibold text-black-100 dark:text-slate-100">
              Automation
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label="Buka panel Config atau Mission"
              onClick={() => setConfigOpen(true)}
            >
              <Settings2 className="size-3.5" aria-hidden />
              {leftTab === "mission" ? "Mission" : "Config"}
              {activeMission || promptBases.length > 0 ? (
                <span className="rounded-full bg-black/10 px-1.5 text-[10px] dark:bg-white/15">
                  {activeMission ? "M" : promptBases.length}
                </span>
              ) : null}
            </Button>
          </div>

          <div className="chat-main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4">
            {hasHistory ? (
              <ChatHistory lines={chatLines} onOpenHistory={onOpenHistory} />
            ) : (
              <EmptyState />
            )}
          </div>

          <div className="shrink-0 border-t border-black/10 bg-white pt-2 dark:border-white/10 dark:bg-black-100">
            <div className="px-3 pb-3 sm:px-4">
              <PromptEditor
                key={composerKey}
                variant="composer"
                value={prompt}
                promptBases={promptBases}
                attachments={promptAttachments}
                platform={platform}
                mobileConfig={mobileConfig}
                placeholder={
                  composingMission
                    ? "Edit intent (PATCH mission) — kelola todos di tab Mission…"
                    : "Tulis intent mission…"
                }
                connectionState={connectionState}
                selectedBridgeId={selectedBridgeId}
                selectedModel={selectedModel}
                bridges={bridges}
                workerState={workerState}
                sendLabel="Susun mission"
                sendTitle="Susun mission (draft)"
                onChange={onPromptChange}
                onAttachmentsChange={onPromptAttachmentsChange}
                onRemovePromptBase={onRemovePromptBase}
                onSelectBridge={onSelectBridge}
                onSelectModel={onSelectModel}
                onPlatformChange={onPlatformChange}
                onMobileConfigChange={onMobileConfigChange}
                onSend={onSend}
                onCancel={onCancel}
              />
            </div>
          </div>
        </div>
      </div>

      {configOpen &&
        createPortal(
          <div className="automation-config-drawer-root" role="presentation">
            <button
              type="button"
              className="automation-config-drawer-backdrop"
              aria-label="Tutup panel"
              onClick={() => setConfigOpen(false)}
            />
            <div
              className="automation-config-drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Config dan Mission"
            >
              <div className="flex shrink-0 items-center gap-1 border-b border-black/10 dark:border-white/10">
                <LeftPanelTabs
                  className="min-w-0 flex-1 border-b-0"
                  value={leftTab}
                  onChange={setLeftTab}
                  missionActive={Boolean(activeMission)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mr-1.5 shrink-0"
                  aria-label="Tutup panel"
                  onClick={() => setConfigOpen(false)}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
              {leftPane}
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="text-2xl font-bold text-black-100 dark:text-greyish-semi-white">
        Susun mission dulu
      </div>
      <p className="mt-2 max-w-md text-sm text-black-40 dark:text-slate-500">
        Pilih provider/model/template di Config, tulis intent, lalu Susun mission —
        LLM menyusun todos → review di tab Mission → Approve & Run.
      </p>
    </div>
  );
}
