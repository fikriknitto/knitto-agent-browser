import type { PromptAttachment } from "../lib/prompt-attachment";
import type { ChatLine, ConnectionState } from "../lib/types";
import { ChatHistory } from "./job-progress";
import { PromptEditor } from "./prompt-editor";
import { PromptShortcutsPanel } from "./prompt-shortcuts-panel";

type ChatMainProps = {
  prompt: string;
  promptAttachments: PromptAttachment[];
  workerState: "idle" | "busy";
  connectionState: ConnectionState;
  selectedBridgeId: string;
  selectedModel: string;
  chatLines: ChatLine[];
  onPromptChange: (value: string) => void;
  onPromptAttachmentsChange: (attachments: PromptAttachment[]) => void;
  onSend: () => void;
  onCancel: () => void;
};

export function ChatMain({
  prompt,
  promptAttachments,
  workerState,
  connectionState,
  selectedBridgeId,
  selectedModel,
  chatLines,
  onPromptChange,
  onPromptAttachmentsChange,
  onSend,
  onCancel,
}: ChatMainProps) {
  return (
    <main className="min-h-full mt-12">
      <div className="chat-column mx-auto flex h-screen flex-col px-3 pb-4 sm:px-4 w-full">
        <ChatHistory lines={chatLines} />

        <div className="composer-shadow fixed bottom-0 pb-4 bg-[#0d0d0d] min-w-4xl shrink-0 space-y-2 pt-2">
          <PromptShortcutsPanel
            disabled={workerState === "busy"}
            selectedBridgeId={selectedBridgeId}
            selectedModel={selectedModel}
            connectionState={connectionState}
            onApply={onPromptChange}
          />
          <PromptEditor
            variant="composer"
            value={prompt}
            attachments={promptAttachments}
            placeholder="Tanyakan automation…"
            connectionState={connectionState}
            selectedBridgeId={selectedBridgeId}
            workerState={workerState}
            onChange={onPromptChange}
            onAttachmentsChange={onPromptAttachmentsChange}
            onSend={onSend}
            onCancel={onCancel}
          />
        </div>
      </div>
    </main>
  );
}
