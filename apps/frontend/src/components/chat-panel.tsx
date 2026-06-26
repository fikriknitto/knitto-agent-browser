import { LayoutGridIcon } from "lucide-react";
import { useState } from "react";
import type { PromptAttachment } from "../lib/prompt-attachment";
import { STRATEGIES } from "../lib/protocol";
import type { BridgeSummary, ChatLine, ConnectionState } from "../lib/types";
import { fieldRow } from "../lib/ui";
import { ChatHistory } from "./job-progress";
import { PromptEditor } from "./prompt-editor";
import { PromptTemplateModal } from "./prompt-template-modal";
import { Button, Card, CardTitle, Label, Select } from "./ui";

type ChatPanelProps = {
  bridges: BridgeSummary[];
  selectedBridgeId: string;
  selectedModel: string;
  strategy: string;
  prompt: string;
  promptAttachments: PromptAttachment[];
  workerState: "idle" | "busy";
  connectionState: ConnectionState;
  chatLines: ChatLine[];
  onSelectBridge: (id: string) => void;
  onSelectModel: (id: string) => void;
  onStrategyChange: (id: string) => void;
  onPromptChange: (value: string) => void;
  onPromptAttachmentsChange: (attachments: PromptAttachment[]) => void;
  onSend: () => void;
  onCancel: () => void;
};

function resolveModelForBridge(
  bridge: BridgeSummary | undefined,
  selectedModel: string
): string {
  if (!bridge?.models?.length) return "";
  if (selectedModel && bridge.models.some((m) => m.id === selectedModel)) {
    return selectedModel;
  }
  if (bridge.defaultModel && bridge.models.some((m) => m.id === bridge.defaultModel)) {
    return bridge.defaultModel;
  }
  return bridge.models[0]!.id;
}

export function ChatPanel({
  bridges,
  selectedBridgeId,
  selectedModel,
  strategy,
  prompt,
  promptAttachments,
  workerState,
  connectionState,
  chatLines,
  onSelectBridge,
  onSelectModel,
  onStrategyChange,
  onPromptChange,
  onPromptAttachmentsChange,
  onSend,
  onCancel,
}: ChatPanelProps) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const bridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
  const model = resolveModelForBridge(bridge, selectedModel);
  const models = bridge?.models ?? [];

  return (
    <Card className="flex min-h-[75vh] flex-col">
      <CardTitle>Automation chat</CardTitle>
      <div className={fieldRow}>
        <Label>
          Bridge
          <Select value={selectedBridgeId} onChange={(e) => onSelectBridge(e.target.value)}>
            <option value="">— select —</option>
            {bridges.map((b) => (
              <option key={b.bridgeId} value={b.bridgeId}>
                {b.bridgeLabel}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          Model
          <Select
            value={model}
            onChange={(e) => onSelectModel(e.target.value)}
            disabled={!models.length}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          Strategy
          <Select value={strategy} onChange={(e) => onStrategyChange(e.target.value)}>
            {STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <ChatHistory lines={chatLines} />

      <div className="mt-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 justify-between">
          <Label className="gap-1">Prompt</Label>
          <Button type="button" size="sm" onClick={() => setTemplateModalOpen(true)}>
            <LayoutGridIcon className="size-4 mr-1" />
            Template
          </Button>
        </div>
        <PromptEditor
          value={prompt}
          attachments={promptAttachments}
          connectionState={connectionState}
          selectedBridgeId={selectedBridgeId}
          workerState={workerState}
          onChange={onPromptChange}
          onAttachmentsChange={onPromptAttachmentsChange}
          onSend={onSend}
          onCancel={onCancel}
        />
      </div>

      <PromptTemplateModal open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} />
    </Card>
  );
}
