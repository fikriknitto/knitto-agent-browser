import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AgentCredentials } from "@/components/settings/agent-credentials";
import { ConnectionPanel } from "@/components/settings/connection-panel";
import { useAutomationWs } from "@/lib/ws/AutomationWsProvider";
import type { RootState } from "@/redux/store";
import {
  setChannel,
  setCredStatus,
  setCursorKey,
  setHost,
  setOpenaiBaseUrl,
  setOpenaiKey,
  setPort,
  setSelectedBridgeId,
  setUseWss,
} from "@/redux/connectionSlice";

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { connect, disconnect, refreshStatus, getClient } = useAutomationWs();
  const {
    host,
    port,
    channel,
    useWss,
    connectionState,
    bridgeAvailable,
    bridges,
    selectedBridgeId,
    cursorKey,
    openaiBaseUrl,
    openaiKey,
    credStatusByKind,
  } = useSelector((s: RootState) => s.connection);

  const browserHeaded = useMemo(() => {
    return bridges.find((b) => b.bridgeId === selectedBridgeId)?.browserHeaded;
  }, [bridges, selectedBridgeId]);

  const sendCursorCred = () => {
    const bridge = bridges.find((b) => b.bridgeKind === "cursor");
    const bridgeId = bridge?.bridgeId ?? selectedBridgeId;
    if (!bridgeId || !cursorKey.trim()) return;
    dispatch(setCredStatus({ kind: "cursor", message: "Sent cursor credentials…" }));
    getClient()?.sendCredentials({
      bridgeId,
      bridgeKind: "cursor",
      apiKey: cursorKey.trim(),
    });
  };

  const sendOpenaiCred = () => {
    const bridge = bridges.find((b) => b.bridgeKind === "openai");
    const bridgeId = bridge?.bridgeId ?? selectedBridgeId;
    const baseUrl = openaiBaseUrl.trim();
    if (!bridgeId || !baseUrl) return;
    dispatch(
      setCredStatus({ kind: "openai", message: "Sent OpenAI-compatible credentials…" })
    );
    getClient()?.sendCredentials({
      bridgeId,
      bridgeKind: "openai",
      openai: { baseUrl, apiKey: openaiKey.trim() },
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">
          Connection &amp; Agents
        </h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          WebSocket ke worker automation dan credential agent (Cursor / OpenAI-compatible).
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-[rgba(12,14,22,0.6)] px-4 py-2">
        <ConnectionPanel
          embedded
          host={host}
          port={port}
          channel={channel}
          useWss={useWss}
          connectionState={connectionState}
          bridgeAvailable={bridgeAvailable}
          browserHeaded={browserHeaded}
          onHostChange={(v) => dispatch(setHost(v))}
          onPortChange={(v) => dispatch(setPort(v))}
          onChannelChange={(v) => dispatch(setChannel(v))}
          onUseWssChange={(v) => dispatch(setUseWss(v))}
          onConnect={connect}
          onDisconnect={disconnect}
          onRefresh={refreshStatus}
        />
        <AgentCredentials
          embedded
          bridges={bridges}
          selectedBridgeId={selectedBridgeId}
          cursorKey={cursorKey}
          openaiBaseUrl={openaiBaseUrl}
          openaiKey={openaiKey}
          statusByBridge={credStatusByKind}
          onSelectBridge={(id) => dispatch(setSelectedBridgeId(id))}
          onCursorKeyChange={(v) => dispatch(setCursorKey(v))}
          onOpenaiBaseUrlChange={(v) => dispatch(setOpenaiBaseUrl(v))}
          onOpenaiKeyChange={(v) => dispatch(setOpenaiKey(v))}
          onSaveCursor={sendCursorCred}
          onSaveOpenai={sendOpenaiCred}
        />
      </div>
    </div>
  );
}
