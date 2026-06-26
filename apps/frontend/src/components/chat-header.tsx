import type { BridgeSummary, ConnectionState } from "../lib/types";
import { Badge, ButtonIcon, Label, Select } from "./ui";

type ChatHeaderProps = {
  bridges: BridgeSummary[];
  selectedBridgeId: string;
  selectedModel: string;
  strategy: string;
  connectionState: ConnectionState;
  bridgeAvailable: boolean;
  onSelectBridge: (id: string) => void;
  onSelectModel: (id: string) => void;
  onStrategyChange: (id: string) => void;
  onOpenSettings: () => void;
};

export function resolveModelForBridge(
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

export function ChatHeader({
  bridges,
  selectedBridgeId,
  selectedModel,
  strategy,
  connectionState,
  bridgeAvailable,
  onSelectBridge,
  onSelectModel,
  onStrategyChange,
  onOpenSettings,
}: ChatHeaderProps) {
  const bridge = bridges.find((b) => b.bridgeId === selectedBridgeId);
  const model = resolveModelForBridge(bridge, selectedModel);
  const models = bridge?.models ?? [];
  const connected = connectionState === "connected";
  const title = bridge?.bridgeLabel ?? "Knitto Agent";

  return (
    <header className="fixed left-0 right-0 top-0 z-[99999] flex h-12 shrink-0 items-center gap-3 border-b border-white/8 bg-[#0d0d0d]/95 px-3 backdrop-blur sm:px-4">
      <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{title}</div>

      <div className="hidden items-center gap-2 md:flex">
        <Label className="gap-1 text-xs text-slate-500">
          Bridge
          <Select
            className="h-8 min-w-[7rem] py-1 text-xs"
            value={selectedBridgeId}
            onChange={(e) => onSelectBridge(e.target.value)}
          >
            <option value="">—</option>
            {bridges.map((b) => (
              <option key={b.bridgeId} value={b.bridgeId}>
                {b.bridgeLabel}
              </option>
            ))}
          </Select>
        </Label>
        <Label className="gap-1 text-xs text-slate-500">
          Model
          <Select
            className="h-8 min-w-[7rem] py-1 text-xs"
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

      </div>

      <div className="flex items-center gap-1.5">
        <Badge variant={connected ? "success" : "default"} className="hidden text-[0.65rem] sm:inline-flex">
          WS {connectionState}
        </Badge>
        <Badge
          variant={bridgeAvailable ? "success" : "default"}
          className="hidden text-[0.65rem] sm:inline-flex"
        >
          Bridge {bridgeAvailable ? "online" : "offline"}
        </Badge>
        <ButtonIcon
          type="button"
          variant="ghost"
          aria-label="Open settings"
          title="Settings"
          onClick={onOpenSettings}
          className="size-8 shrink-0 rounded-lg"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </ButtonIcon>
      </div>
    </header>
  );
}
