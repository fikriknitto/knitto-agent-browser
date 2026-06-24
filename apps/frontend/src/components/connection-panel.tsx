import { DEFAULT_CHANNEL, DEFAULT_WS_HOST, DEFAULT_WS_PORT } from "../lib/protocol";
import type { ConnectionState } from "../lib/types";
import { btnRow, fieldRow, hint, statusLine } from "../lib/ui";
import { Badge, Button, Card, CardTitle, Input, Label } from "./ui";

type ConnectionPanelProps = {
  host: string;
  port: string;
  channel: string;
  connectionState: ConnectionState;
  bridgeAvailable: boolean;
  browserHeaded?: boolean;
  onHostChange: (value: string) => void;
  onPortChange: (value: string) => void;
  onChannelChange: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
};

export function ConnectionPanel({
  host,
  port,
  channel,
  connectionState,
  bridgeAvailable,
  browserHeaded,
  onHostChange,
  onPortChange,
  onChannelChange,
  onConnect,
  onDisconnect,
  onRefresh,
}: ConnectionPanelProps) {
  const connected = connectionState === "connected";

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
      <div className={btnRow}>
        {!connected ? (
          <Button onClick={onConnect} disabled={connectionState === "connecting"}>
            {connectionState === "connecting" ? "Connecting…" : "Connect"}
          </Button>
        ) : (
          <>
            <Button onClick={onDisconnect}>Disconnect</Button>
            <Button onClick={onRefresh}>Refresh bridges</Button>
          </>
        )}
      </div>
      <p className={statusLine}>
        Socket:{" "}
        <Badge variant={connected ? "success" : "default"}>{connectionState}</Badge>
        Bridge:{" "}
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
          <span className={hint}>Set AUTOMATION_HEADLESS=false on bridge for headed mode.</span>
        </p>
      )}
    </Card>
  );
}
