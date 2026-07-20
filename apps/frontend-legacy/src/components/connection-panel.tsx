import { DEFAULT_CHANNEL, DEFAULT_WS_HOST, DEFAULT_WS_PORT } from "../lib/protocol";
import type { ConnectionState } from "../lib/types";
import { btnRow, fieldRow, hint, statusLine } from "../lib/ui";
import { SettingsRow, SettingsSectionTitle } from "./settings-row";
import { Badge, Button, Card, CardTitle, Input, Label } from "./ui";

type ConnectionPanelProps = {
  embedded?: boolean;
  host: string;
  port: string;
  channel: string;
  useWss: boolean;
  connectionState: ConnectionState;
  bridgeAvailable: boolean;
  browserHeaded?: boolean;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onChannelChange: (value: string) => void;
  onUseWssChange: (value: boolean) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
};

export function ConnectionPanel({
  embedded = false,
  host,
  port,
  channel,
  useWss,
  connectionState,
  bridgeAvailable,
  browserHeaded,
  onHostChange,
  onPortChange,
  onChannelChange,
  onUseWssChange,
  onConnect,
  onDisconnect,
  onRefresh,
}: ConnectionPanelProps) {
  const connected = connectionState === "connected";

  if (embedded) {
    return (
      <section>
        <SettingsSectionTitle>Connection</SettingsSectionTitle>
        <SettingsRow label="Host">
          <Input
            className="w-56 max-w-xs"
            value={host}
            onChange={(e) => onHostChange(e.target.value)}
            placeholder={DEFAULT_WS_HOST}
            disabled={connected}
          />
        </SettingsRow>
        <SettingsRow label="Port">
          <Input
            className="w-56 max-w-xs"
            value={port}
            onChange={(e) => onPortChange(e.target.value)}
            placeholder={DEFAULT_WS_PORT}
            disabled={connected}
          />
        </SettingsRow>
        <SettingsRow label="Channel">
          <Input
            className="w-56 max-w-xs"
            value={channel}
            onChange={(e) => onChannelChange(e.target.value)}
            placeholder={DEFAULT_CHANNEL}
            disabled={connected}
          />
        </SettingsRow>
        <SettingsRow label="Gunakan WSS (TLS)" description="Secure WebSocket connection">
          <input
            type="checkbox"
            checked={useWss}
            onChange={(e) => onUseWssChange(e.target.checked)}
            disabled={connected}
            className="size-4 rounded border-slate-600 bg-slate-900 accent-cyan-500"
          />
        </SettingsRow>
        <SettingsRow label="Actions">
          <div className="flex flex-wrap justify-end gap-2">
            {!connected ? (
              <Button
                variant="outline"
                onClick={onConnect}
                disabled={connectionState === "connecting"}
              >
                {connectionState === "connecting" ? "Connecting…" : "Connect"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onDisconnect}>
                  Disconnect
                </Button>
                <Button variant="outline" onClick={onRefresh}>
                  Refresh agents
                </Button>
              </>
            )}
          </div>
        </SettingsRow>
        <SettingsRow label="Status">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={connected ? "success" : "default"}>{connectionState}</Badge>
            <Badge variant={bridgeAvailable ? "success" : "default"}>
              {bridgeAvailable ? "Agent online" : "Agent offline"}
            </Badge>
          </div>
        </SettingsRow>
        {bridgeAvailable && typeof browserHeaded === "boolean" && (
          <SettingsRow
            label="Browser mode"
            description="Set AUTOMATION_HEADLESS=false on the agent worker for headed mode."
          >
            <Badge variant={browserHeaded ? "success" : "default"}>
              {browserHeaded ? "Headed (visible)" : "Headless"}
            </Badge>
          </SettingsRow>
        )}
      </section>
    );
  }

  return (
    <Card>
      <CardTitle>Connection</CardTitle>
      <div className={fieldRow}>
        <Label>
          Host
          <Input
            value={host}
            onChange={(e) => onHostChange(e.target.value)}
            placeholder={DEFAULT_WS_HOST}
            disabled={connected}
          />
        </Label>
        <Label>
          Port
          <Input
            value={port}
            onChange={(e) => onPortChange(e.target.value)}
            placeholder={DEFAULT_WS_PORT}
            disabled={connected}
          />
        </Label>
        <Label>
          Channel
          <Input
            value={channel}
            onChange={(e) => onChannelChange(e.target.value)}
            placeholder={DEFAULT_CHANNEL}
            disabled={connected}
          />
        </Label>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={useWss}
          onChange={(e) => onUseWssChange(e.target.checked)}
          disabled={connected}
          className="size-4 rounded border-slate-600 bg-slate-900 accent-cyan-500"
        />
        Gunakan WSS (TLS)
      </label>
      <div className={btnRow}>
        {!connected ? (
          <Button variant="outline" onClick={onConnect} disabled={connectionState === "connecting"}>
            {connectionState === "connecting" ? "Connecting…" : "Connect"}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onDisconnect}>
              Disconnect
            </Button>
            <Button variant="outline" onClick={onRefresh}>
              Refresh agents
            </Button>
          </>
        )}
      </div>
      <p className={statusLine}>
        Socket:{" "}
        <Badge variant={connected ? "success" : "default"}>{connectionState}</Badge>
        Agent:{" "}
        <Badge variant={bridgeAvailable ? "success" : "default"}>
          {bridgeAvailable ? "Online" : "Offline"}
        </Badge>
      </p>
      {bridgeAvailable && typeof browserHeaded === "boolean" && (
        <p className={statusLine}>
          Browser:{" "}
          <Badge variant={browserHeaded ? "success" : "default"}>
            {browserHeaded ? "Headed (visible)" : "Headless"}
          </Badge>
          <br />
          <span className={hint}>Set AUTOMATION_HEADLESS=false on the agent worker for headed mode.</span>
        </p>
      )}
    </Card>
  );
}
