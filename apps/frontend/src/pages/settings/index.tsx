import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AgentCredentials } from "@/components/settings/agent-credentials";
import { ConnectionPanel } from "@/components/settings/connection-panel";
import { useAutomationWs } from "@/lib/ws/AutomationWsProvider";
import { useUserLogin } from "@/lib/hooks/use-user-login";
import type { RootState } from "@/redux/store";
import {
  addOpenaiProvider,
  removeOpenaiProvider,
  setChannel,
  setCredStatus,
  setCursorKey,
  setHost,
  setOpenaiProviderRemoteId,
  setPort,
  setUseWss,
  updateOpenaiProvider,
} from "@/redux/connectionSlice";
import type { OpenaiProvider } from "@/redux/connectionSlice";
import {
  useCreateCredentialMutation,
  useListCredentialsQuery,
  useUpdateCredentialMutation,
} from "@/redux/api/aiProviderCredentials";

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
    openaiProviders,
    credStatusByBridgeId,
  } = useSelector((s: RootState) => s.connection);

  const browserHeaded = useMemo(() => {
    return bridges.find((b) => b.bridgeId === selectedBridgeId)?.browserHeaded;
  }, [bridges, selectedBridgeId]);

  const { authorized } = useUserLogin();
  const { data: remoteCredentials } = useListCredentialsQuery(undefined, { skip: !authorized });
  const [createCredential] = useCreateCredentialMutation();
  const [updateCredential] = useUpdateCredentialMutation();

  // Populate the provider list from API Data once (by name match against
  // whatever is already loaded from localStorage) instead of purely
  // localStorage-backed state — keeps the existing WS credential push intact.
  // The provider <-> credential id mapping itself is stored on the provider
  // (`remoteId`, persisted in Redux) rather than local component state, so
  // other pages (e.g. Automation) can resolve verification status by id
  // instead of a fragile name-string match.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!authorized || !remoteCredentials || syncedRef.current) return;
    syncedRef.current = true;

    const usedRemoteIds = new Set<number>();

    for (const provider of openaiProviders) {
      if (provider.remoteId) {
        usedRemoteIds.add(provider.remoteId);
        continue;
      }
      const match = remoteCredentials.find(
        (c) =>
          !usedRemoteIds.has(c.id) &&
          c.name.trim().toLowerCase() === provider.name.trim().toLowerCase()
      );
      if (match) {
        usedRemoteIds.add(match.id);
        dispatch(setOpenaiProviderRemoteId({ id: provider.id, remoteId: match.id }));
      }
    }

    // Any remote credential not matched to a local row gets added so the
    // list reflects what's durably saved server-side.
    for (const cred of remoteCredentials) {
      if (usedRemoteIds.has(cred.id)) continue;
      const provider = {
        id: crypto.randomUUID(),
        name: cred.name,
        baseUrl: cred.baseUrl,
        apiKey: "",
        remoteId: cred.id,
      };
      dispatch(addOpenaiProvider(provider));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, remoteCredentials]);

  const sendCursorCred = () => {
    const bridge = bridges.find((b) => b.bridgeKind === "cursor");
    const bridgeId = bridge?.bridgeId;
    if (!bridgeId || !cursorKey.trim()) return;
    dispatch(setCredStatus({ bridgeId, message: "Sent cursor credentials…" }));
    getClient()?.sendCredentials({
      bridgeId,
      bridgeKind: "cursor",
      apiKey: cursorKey.trim(),
    });
  };

  const pushOpenaiProviderCredToWorker = (provider: OpenaiProvider) => {
    const baseUrl = provider.baseUrl.trim();
    const name = provider.name.trim();
    if (!baseUrl || !name) return;
    dispatch(
      setCredStatus({
        bridgeId: provider.id,
        message: `Sent credentials for ${name}…`,
      })
    );
    const client = getClient();
    client?.sendOpenaiProvidersSync(
      openaiProviders.map((p) => ({
        id: p.id,
        name: p.name.trim() || "OpenAI-compatible",
      }))
    );
    client?.sendCredentials({
      bridgeId: provider.id,
      bridgeKind: "openai",
      openai: {
        name,
        baseUrl,
        apiKey: provider.apiKey.trim(),
      },
    });
  };

  const sendOpenaiProviderCred = async (provider: OpenaiProvider) => {
    const baseUrl = provider.baseUrl.trim();
    const name = provider.name.trim();
    if (!baseUrl || !name) return;

    if (!authorized) {
      // Not authorized against API Data — fall back to WS-only push
      // (legacy behavior), no durable server-side persistence.
      pushOpenaiProviderCredToWorker(provider);
      return;
    }

    try {
      if (provider.remoteId) {
        await updateCredential({
          id: provider.remoteId,
          patch: { name, baseUrl, apiKey: provider.apiKey.trim() || undefined },
        }).unwrap();
      } else {
        const created = await createCredential({
          name,
          baseUrl,
          apiKey: provider.apiKey.trim(),
        }).unwrap();
        dispatch(setOpenaiProviderRemoteId({ id: provider.id, remoteId: created.id }));
      }
    } catch (err) {
      dispatch(
        setCredStatus({
          bridgeId: provider.id,
          message: err instanceof Error ? err.message : "Gagal menyimpan credential",
          valid: false,
        })
      );
      return;
    }

    pushOpenaiProviderCredToWorker(provider);
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

      <div className="rounded-xl border border-black/10 bg-white px-4 py-2 dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
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
          cursorKey={cursorKey}
          openaiProviders={openaiProviders}
          statusByBridgeId={credStatusByBridgeId}
          onCursorKeyChange={(v) => dispatch(setCursorKey(v))}
          onAddOpenaiProvider={() => dispatch(addOpenaiProvider())}
          onUpdateOpenaiProvider={(id, patch) =>
            dispatch(updateOpenaiProvider({ id, patch }))
          }
          onRemoveOpenaiProvider={(id) => dispatch(removeOpenaiProvider(id))}
          onSaveCursor={sendCursorCred}
          onSaveOpenaiProvider={sendOpenaiProviderCred}
        />
      </div>
    </div>
  );
}
