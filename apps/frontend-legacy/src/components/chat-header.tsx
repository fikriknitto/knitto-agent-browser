import { HistoryIcon, SettingsIcon } from "lucide-react";
import type { ConnectionState } from "../lib/types";
import { Badge, Button } from "./ui";

type ChatHeaderProps = {
  connectionState: ConnectionState;
  bridgeAvailable: boolean;
  apiDataUsername?: string | null;
  onOpenSettings: () => void;
  onOpenHistory?: () => void;
  onLogout?: () => void;
};

export function ChatHeader({
  connectionState,
  bridgeAvailable,
  apiDataUsername,
  onOpenSettings,
  onOpenHistory,
  onLogout,
}: ChatHeaderProps) {
  const connected = connectionState === "connected";

  return (
    <header className="fixed left-0 right-0 top-0 z-[99999] flex h-12 shrink-0 items-center gap-3 border-b border-white/8 bg-[#0d0d0d]/95 px-3 backdrop-blur sm:px-4">
      <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
        Knitto Automation
      </div>

      <div className="flex items-center gap-1.5">
        {apiDataUsername ? (
          <Badge
            variant="info"
            className="hidden max-w-[10rem] truncate text-[0.65rem] sm:inline-flex"
          >
            {apiDataUsername}
          </Badge>
        ) : null}
        <Badge
          variant={connected ? "success" : "default"}
          className="hidden text-[0.65rem] sm:inline-flex"
        >
          WS {connectionState}
        </Badge>
        <Badge
          variant={bridgeAvailable ? "success" : "default"}
          className="hidden text-[0.65rem] sm:inline-flex"
        >
          Agent {bridgeAvailable ? "online" : "offline"}
        </Badge>
        {onLogout ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden text-xs text-slate-400 sm:inline-flex"
            onClick={onLogout}
          >
            Logout
          </Button>
        ) : null}
        {onOpenHistory ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Run history"
            title="Run history"
            onClick={onOpenHistory}
          >
            <HistoryIcon className="size-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          <SettingsIcon />
        </Button>
      </div>
    </header>
  );
}
