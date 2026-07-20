import { useAutomationWs } from "@/lib/ws/AutomationWsProvider";
import {
  setChannel,
  setHost,
  setPort,
  setUseWss,
} from "@/redux/connectionSlice";
import type { RootState } from "@/redux/store";
import { Button } from "@knittotextile/react-ui";
import { useDispatch, useSelector } from "react-redux";

/** Minimal connection controls for Fase 2 smoke (full UI in Fase 4). */
export default function AutomationPage() {
  const dispatch = useDispatch();
  const { connect, disconnect, refreshStatus } = useAutomationWs();
  const {
    host,
    port,
    channel,
    useWss,
    connectionState,
    bridgeAvailable,
    bridges,
  } = useSelector((s: RootState) => s.connection);
  const { chatLines, workerState } = useSelector((s: RootState) => s.automation);

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold text-navy-100 dark:text-white">Automation</h1>
      <p className="text-sm text-black-60 dark:text-greyish-semi-white">
        Fondasi WS (Fase 2). Chat UI penuh di Fase 3.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Host
          <input
            className="mt-1 w-full rounded border px-2 py-1 dark:bg-black-80"
            value={host}
            onChange={(e) => dispatch(setHost(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Port
          <input
            className="mt-1 w-full rounded border px-2 py-1 dark:bg-black-80"
            value={port}
            onChange={(e) => dispatch(setPort(e.target.value))}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Channel
          <input
            className="mt-1 w-full rounded border px-2 py-1 dark:bg-black-80"
            value={channel}
            onChange={(e) => dispatch(setChannel(e.target.value))}
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={useWss}
            onChange={(e) => dispatch(setUseWss(e.target.checked))}
          />
          Use WSS
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={connect} disabled={connectionState === "connecting"}>
          {connectionState === "connecting" ? "Connecting…" : "Connect"}
        </Button>
        <Button size="sm" variant="outline" onClick={disconnect}>
          Disconnect
        </Button>
        <Button size="sm" variant="outline" onClick={refreshStatus}>
          Refresh status
        </Button>
      </div>

      <div className="text-sm space-y-1">
        <div>
          Status: <strong>{connectionState}</strong>
          {bridgeAvailable ? " · bridge available" : ""}
          {workerState === "busy" ? " · worker busy" : ""}
        </div>
        <div>Agents: {bridges.map((b) => b.bridgeLabel).join(", ") || "—"}</div>
      </div>

      <div className="rounded border p-3 max-h-64 overflow-auto text-xs space-y-1 dark:border-black-60">
        {chatLines.length === 0 ? (
          <p className="opacity-60">Belum ada event (join / credentials / job).</p>
        ) : (
          chatLines.map((line) => (
            <div key={`${line.id}-${line.role}`}>
              <span className="opacity-50">[{line.role}]</span> {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
