import type { AutomationPlatform, MobileConfig } from "@knitto/shared";
import type { PromptAttachment } from "../lib/prompt-attachment";
import type { AppliedPromptShortcut } from "../lib/prompt-compose";
import type { PromptShortcut } from "../lib/prompt-shortcuts";
import type { BridgeSummary, ChatLine, ConnectionState } from "../lib/types";
import { ChatHistory } from "./job-progress";
import { PromptEditor } from "./prompt-editor";
import { PromptShortcutsPanel } from "./prompt-shortcuts-panel";

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
}: ChatMainProps) {
  const hasHistory = chatLines.length > 0;

  const composer = (
    <div className="chat-column mx-auto w-full space-y-2 px-3 pb-4 pt-2 sm:px-4">
      <PromptShortcutsPanel
        disabled={workerState === "busy"}
        onAddPromptBase={onAddPromptBase}
        onApplyMainPrompt={onApplyMainPrompt}
        previewEditable
      />
      <PromptEditor
        variant="composer"
        value={prompt}
        promptBases={promptBases}
        attachments={promptAttachments}
        platform={platform}
        mobileConfig={mobileConfig}
        placeholder="Tanyakan automation…"
        connectionState={connectionState}
        selectedBridgeId={selectedBridgeId}
        selectedModel={selectedModel}
        bridges={bridges}
        workerState={workerState}
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
  );

  if (!hasHistory) {
    return (
      <main className="flex h-[calc(100dvh-3rem)] flex-col pt-12">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-3 pb-4 sm:px-4">
          <EmptyState />
          {composer}
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[calc(100dvh-3rem)] pt-12">
      {/* Full viewport width → scrollbar sits on the right edge */}
      <div className="chat-main-scroll h-full overflow-y-auto overflow-x-hidden">
        <div className="chat-column mx-auto w-full px-3 pb-52 pt-2 sm:px-4">
          <ChatHistory lines={chatLines} onOpenHistory={onOpenHistory} />
        </div>
      </div>

      <div className="composer-shadow fixed bottom-0 left-0 right-0 z-10 bg-[#0d0d0d]">
        {composer}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col items-center justify-center text-center">
      <div className="text-2xl font-bold">Apa yang ingin Anda otomatisasi?</div>
    </div>
  );
}
