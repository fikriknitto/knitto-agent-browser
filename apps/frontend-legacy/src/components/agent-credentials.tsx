import type { BridgeSummary } from "../lib/types";
import { hint, statusMessage as statusMessageClass } from "../lib/ui";
import { SettingsRow, SettingsRowStacked, SettingsSectionTitle } from "./settings-row";
import { Button, Card, CardTitle, Input, Select } from "./ui";

export type AgentCredKind = "cursor" | "openai";

export type AgentCredStatus = {
  message: string;
  /** true = verified, false = rejected, undefined = pending / info */
  valid?: boolean;
};

export type AgentCredStatusMap = Partial<Record<AgentCredKind, AgentCredStatus>>;

const LOCAL_OPENAI_PRESET_BASE_URL = "http://localhost:20128";

type AgentCredentialsProps = {
  embedded?: boolean;
  bridges: BridgeSummary[];
  selectedBridgeId: string;
  cursorKey: string;
  openaiBaseUrl: string;
  openaiKey: string;
  statusByBridge: AgentCredStatusMap;
  onSelectBridge: (id: string) => void;
  onCursorKeyChange: (value: string) => void;
  onOpenaiBaseUrlChange: (value: string) => void;
  onOpenaiKeyChange: (value: string) => void;
  onSaveCursor: () => void;
  onSaveOpenai: () => void;
};

const controlWidth = "w-56 max-w-xs";

function statusClassName(valid: boolean | undefined): string {
  if (valid === true) return `${statusMessageClass} text-emerald-400`;
  if (valid === false) return `${statusMessageClass} text-rose-400`;
  return statusMessageClass;
}

function CredStatusLine({ status }: { status?: AgentCredStatus }) {
  if (!status?.message) return null;
  return (
    <p className={`${statusClassName(status.valid)} max-w-xs text-right`}>{status.message}</p>
  );
}

export function AgentCredentials({
  embedded = false,
  bridges,
  selectedBridgeId,
  cursorKey,
  openaiBaseUrl,
  openaiKey,
  statusByBridge,
  onSelectBridge,
  onCursorKeyChange,
  onOpenaiBaseUrlChange,
  onOpenaiKeyChange,
  onSaveCursor,
  onSaveOpenai,
}: AgentCredentialsProps) {
  const productAgents = bridges.filter(
    (b) => b.bridgeKind === "cursor" || b.bridgeKind === "openai"
  );
  const cursorAgent = productAgents.find((b) => b.bridgeKind === "cursor");
  const openaiAgent = productAgents.find((b) => b.bridgeKind === "openai");

  const form = (
    <>
      <SettingsSectionTitle>{embedded ? "Agent credentials" : null}</SettingsSectionTitle>
      {!embedded ? null : (
        <p className={`${hint} mb-2 px-0`}>
          Simpan credential per agent, atau set env (
          <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
            CURSOR_API_KEY
          </code>
          ,{" "}
          <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
            OPENAI_COMPAT_BASE_URL
          </code>
          ).
        </p>
      )}

      <SettingsRow label="Agent">
        <Select
          className={controlWidth}
          value={selectedBridgeId}
          onChange={(e) => onSelectBridge(e.target.value)}
        >
          {productAgents.map((b) => (
            <option key={b.bridgeId} value={b.bridgeId}>
              {b.bridgeLabel}
            </option>
          ))}
        </Select>
      </SettingsRow>

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
        <CredStatusLine status={statusByBridge.cursor} />
      </SettingsRowStacked>

      <SettingsRowStacked label="OpenAI-compatible">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Input
            className={controlWidth}
            type="url"
            autoComplete="off"
            placeholder={!openaiAgent ? "Offline" : "Base URL"}
            value={openaiBaseUrl}
            onChange={(e) => onOpenaiBaseUrlChange(e.target.value)}
            disabled={!openaiAgent}
          />
          <Button
            type="button"
            size="sm"
            disabled={!openaiAgent}
            onClick={() => onOpenaiBaseUrlChange(LOCAL_OPENAI_PRESET_BASE_URL)}
            title="Isi Base URL preset lokal (localhost:20128)"
          >
            Preset lokal
          </Button>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
          <Input
            className={controlWidth}
            type="password"
            autoComplete="off"
            placeholder="API key (opsional)"
            value={openaiKey}
            onChange={(e) => onOpenaiKeyChange(e.target.value)}
            disabled={!openaiAgent}
          />
          <Button
            type="button"
            size="sm"
            disabled={!openaiAgent || !openaiBaseUrl.trim()}
            onClick={onSaveOpenai}
          >
            Save
          </Button>
        </div>
        <CredStatusLine status={statusByBridge.openai} />
      </SettingsRowStacked>
    </>
  );

  if (embedded) {
    return <section className="mt-2 border-t border-white/8 pt-2">{form}</section>;
  }

  return (
    <Card>
      <CardTitle>Agent credentials</CardTitle>
      <p className={`${hint} mb-3`}>
        Cursor memakai API key. OpenAI-compatible memakai Base URL + key (preset lokal mengisi
        Base URL di localhost:20128).
      </p>
      {form}
    </Card>
  );
}
