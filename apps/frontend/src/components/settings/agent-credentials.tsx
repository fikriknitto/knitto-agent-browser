import { useState } from "react";
import { FlaskConical, PencilIcon } from "lucide-react";
import type { BridgeSummary } from "@/types/automation";
import type { CredStatus, OpenaiProvider } from "@/redux/connectionSlice";
import { hint, statusMessage as statusMessageClass } from "@/lib/utils/ui";
import { SettingsRow, SettingsRowStacked, SettingsSectionTitle } from "./settings-row";
import { Badge, Button, Card, CardTitle, Input } from "@/components/chat/ui";
import { useUserLogin } from "@/lib/hooks/use-user-login";
import {
  useListCredentialsQuery,
  useTestCredentialMutation,
  useTestSavedCredentialMutation,
  type AiProviderCredential,
} from "@/redux/api/aiProviderCredentials";

type AgentCredentialsProps = {
  embedded?: boolean;
  bridges: BridgeSummary[];
  cursorKey: string;
  openaiProviders: OpenaiProvider[];
  statusByBridgeId: Record<string, CredStatus>;
  onCursorKeyChange: (value: string) => void;
  onAddOpenaiProvider: () => void;
  onUpdateOpenaiProvider: (
    id: string,
    patch: Partial<Pick<OpenaiProvider, "name" | "baseUrl" | "apiKey">>
  ) => void;
  onRemoveOpenaiProvider: (id: string) => void;
  onSaveCursor: () => void;
  onSaveOpenaiProvider: (provider: OpenaiProvider) => void;
};

const controlWidth = "w-56 max-w-xs";

function statusClassName(valid: boolean | undefined): string {
  if (valid === true) return `${statusMessageClass} text-emerald-400`;
  if (valid === false) return `${statusMessageClass} text-rose-400`;
  return statusMessageClass;
}

function CredStatusLine({ status }: { status?: CredStatus }) {
  if (!status?.message) return null;
  return (
    <p className={`${statusClassName(status.valid)} max-w-xs text-right`}>{status.message}</p>
  );
}

type TestResult = { message: string; valid: boolean };

/** Test-connection button for one OpenAI-compatible provider row. */
function TestCredentialButton({
  provider,
  remoteId,
  onTested,
}: {
  provider: OpenaiProvider;
  remoteId?: number;
  /** Fired after a test call resolves (success or failure) so the row can react (e.g. auto-lock). */
  onTested?: (result: TestResult) => void;
}) {
  const [testUnsaved, testUnsavedState] = useTestCredentialMutation();
  const [testSaved, testSavedState] = useTestSavedCredentialMutation();
  const [result, setResult] = useState<TestResult | null>(null);

  const loading = testUnsavedState.isLoading || testSavedState.isLoading;
  const disabled = loading || !provider.baseUrl.trim();

  const handleClick = async () => {
    setResult(null);
    try {
      const res = remoteId
        ? await testSaved(remoteId).unwrap()
        : await testUnsaved({
            baseUrl: provider.baseUrl.trim(),
            apiKey: provider.apiKey.trim(),
          }).unwrap();
      setResult(res);
      onTested?.(res);
    } catch (err) {
      const failed: TestResult = {
        valid: false,
        message: err instanceof Error ? err.message : "Test gagal",
      };
      setResult(failed);
      onTested?.(failed);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`Test koneksi ${provider.name || "provider"}`}
        title="Test koneksi"
        disabled={disabled}
        onClick={handleClick}
      >
        <FlaskConical className="size-4" aria-hidden />
      </Button>
      {result?.message ? (
        <p className={`${statusClassName(result.valid)} w-full max-w-xs text-right`}>
          {result.message}
        </p>
      ) : null}
    </>
  );
}

function ConnectionBadge({ status }: { status: AiProviderCredential["connectionStatus"] }) {
  if (status === "connected") return <Badge variant="success">Connected</Badge>;
  if (status === "failed") return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="warning">Untested</Badge>;
}

/**
 * One OpenAI-compatible provider row. Once its saved credential's last test
 * came back `connected`, the row locks into a read-only summary — fields
 * can't be changed accidentally; the user must click Edit to unlock them.
 * Editing (baseUrl/apiKey) always resets the server-side status to
 * "untested" (see `ai-provider-credentials.repository.ts`), so the row
 * automatically falls back to the editable form until re-tested and it
 * relocks on the next successful test.
 */
function OpenaiProviderRow({
  provider,
  credential,
  onUpdate,
  onRemove,
  onSave,
}: {
  provider: OpenaiProvider;
  credential?: AiProviderCredential;
  onUpdate: (id: string, patch: Partial<Pick<OpenaiProvider, "name" | "baseUrl" | "apiKey">>) => void;
  onRemove: (id: string) => void;
  onSave: (provider: OpenaiProvider) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const verified = credential?.connectionStatus === "connected";
  const locked = verified && !isEditing;

  if (locked) {
    return (
      <div className="w-full max-w-md rounded-lg border border-black/10 p-3 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-black-100 dark:text-slate-100">
              {provider.name || "OpenAI-compatible"}
            </p>
            <p className="truncate text-xs text-black-60 dark:text-slate-400">{provider.baseUrl}</p>
          </div>
          <ConnectionBadge status={credential.connectionStatus} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onRemove(provider.id)}
          >
            Delete
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            <PencilIcon className="size-4" aria-hidden />
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-black/10 p-3 dark:border-white/10">
      {credential ? (
        <div className="mb-2 flex justify-end">
          <ConnectionBadge status={credential.connectionStatus} />
        </div>
      ) : null}
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <Input
          className="min-w-[10rem] flex-1"
          placeholder="Name (e.g. 9Router)"
          value={provider.name}
          onChange={(e) => onUpdate(provider.id, { name: e.target.value })}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => onRemove(provider.id)}>
          Delete
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Input
          className="min-w-[12rem] flex-1"
          type="url"
          autoComplete="off"
          placeholder="Base URL"
          value={provider.baseUrl}
          onChange={(e) => onUpdate(provider.id, { baseUrl: e.target.value })}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <Input
          className="min-w-[12rem] flex-1"
          type="password"
          autoComplete="off"
          placeholder="API key (opsional)"
          value={provider.apiKey}
          onChange={(e) => onUpdate(provider.id, { apiKey: e.target.value })}
        />
        {verified ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={!provider.name.trim() || !provider.baseUrl.trim()}
          onClick={() => onSave(provider)}
        >
          Save
        </Button>
        <TestCredentialButton
          provider={provider}
          remoteId={credential?.id}
          onTested={(result) => {
            // Only auto-relock a previously-edited row on a fresh success —
            // an unsaved/untested provider stays editable until Save+Test.
            if (result.valid && credential?.id) setIsEditing(false);
          }}
        />
      </div>
    </div>
  );
}

export function AgentCredentials({
  embedded = false,
  bridges,
  cursorKey,
  openaiProviders,
  statusByBridgeId,
  onCursorKeyChange,
  onAddOpenaiProvider,
  onUpdateOpenaiProvider,
  onRemoveOpenaiProvider,
  onSaveCursor,
  onSaveOpenaiProvider,
}: AgentCredentialsProps) {
  const cursorAgent = bridges.find((b) => b.bridgeKind === "cursor");
  const { authorized } = useUserLogin();
  const { data: credentials } = useListCredentialsQuery(undefined, { skip: !authorized });

  const form = (
    <>
      <SettingsSectionTitle>{embedded ? "Agent credentials" : null}</SettingsSectionTitle>
      {!embedded ? null : (
        <p className={`${hint} mb-2 px-0`}>
          Simpan credential per agent. Cursor memakai API key; OpenAI-compatible bisa ditambah
          beberapa (9Router, LiteLLM, Local, dll).
        </p>
      )}

      <SettingsRowStacked label="Cursor API key">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Input
            className={controlWidth}
            type="password"
            autoComplete="off"
            placeholder={!cursorAgent ? "Cursor offline" : "Cursor API key"}
            value={cursorKey}
            onChange={(e) => onCursorKeyChange(e.target.value)}
            disabled={!cursorAgent}
          />
          <Button
            type="button"
            size="sm"
            disabled={!cursorAgent || !cursorKey.trim()}
            onClick={onSaveCursor}
          >
            Save
          </Button>
        </div>
        <CredStatusLine
          status={cursorAgent ? statusByBridgeId[cursorAgent.bridgeId] : undefined}
        />
      </SettingsRowStacked>

      <SettingsRowStacked label="OpenAI-compatible providers">
        <div className="flex w-full flex-col items-end gap-3">
          {openaiProviders.length === 0 ? (
            <p className={`${hint} text-right`}>Belum ada provider. Tambah untuk 9Router, LiteLLM, dll.</p>
          ) : null}
          {openaiProviders.map((provider) => {
            const credential = credentials?.find((c) => c.id === provider.remoteId);
            return (
              <div key={provider.id} className="flex w-full max-w-md flex-col items-end gap-1">
                <OpenaiProviderRow
                  provider={provider}
                  credential={credential}
                  onUpdate={onUpdateOpenaiProvider}
                  onRemove={onRemoveOpenaiProvider}
                  onSave={onSaveOpenaiProvider}
                />
                <CredStatusLine status={statusByBridgeId[provider.id]} />
              </div>
            );
          })}
          <Button type="button" size="sm" variant="outline" onClick={onAddOpenaiProvider}>
            Add provider
          </Button>
        </div>
      </SettingsRowStacked>
    </>
  );

  if (embedded) {
    return <section className="mt-2 border-t border-black/10 pt-2 dark:border-white/8">{form}</section>;
  }

  return (
    <Card>
      <CardTitle>Agent credentials</CardTitle>
      <p className={`${hint} mb-3`}>
        Cursor memakai API key. Tambah beberapa OpenAI-compatible provider dengan nama sendiri
        (mis. 9Router, LiteLLM, Local).
      </p>
      {form}
    </Card>
  );
}
