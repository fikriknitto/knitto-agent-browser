import type { BridgeSummary } from "../lib/types";
import { hint, statusMessage as statusMessageClass } from "../lib/ui";
import { SettingsRow, SettingsRowStacked, SettingsSectionTitle } from "./settings-row";
import { Button, Card, CardTitle, Input, Label, Select } from "./ui";

type BridgeCredentialsProps = {
  embedded?: boolean;
  bridges: BridgeSummary[];
  selectedBridgeId: string;
  geminiKey: string;
  cursorKey: string;
  openRouterKey: string;
  nineRouterBaseUrl: string;
  nineRouterKey: string;
  statusMessage: string;
  onSelectBridge: (id: string) => void;
  onGeminiKeyChange: (value: string) => void;
  onCursorKeyChange: (value: string) => void;
  onOpenRouterKeyChange: (value: string) => void;
  onNineRouterBaseUrlChange: (value: string) => void;
  onNineRouterKeyChange: (value: string) => void;
  onSaveGemini: () => void;
  onSaveCursor: () => void;
  onSaveOpenRouter: () => void;
  onSaveNineRouter: () => void;
};

const controlWidth = "w-56 max-w-xs";

export function BridgeCredentials({
  embedded = false,
  bridges,
  selectedBridgeId,
  geminiKey,
  cursorKey,
  openRouterKey,
  nineRouterBaseUrl,
  nineRouterKey,
  statusMessage,
  onSelectBridge,
  onGeminiKeyChange,
  onCursorKeyChange,
  onOpenRouterKeyChange,
  onNineRouterBaseUrlChange,
  onNineRouterKeyChange,
  onSaveGemini,
  onSaveCursor,
  onSaveOpenRouter,
  onSaveNineRouter,
}: BridgeCredentialsProps) {
  const selected = bridges.find((b) => b.bridgeId === selectedBridgeId);
  const geminiBridge = bridges.find((b) => b.bridgeKind === "gemini");
  const cursorBridge = bridges.find((b) => b.bridgeKind === "cursor");
  const openRouterBridge = bridges.find((b) => b.bridgeKind === "openrouter");
  const nineRouterBridge = bridges.find((b) => b.bridgeKind === "ninerouter");

  if (embedded) {
    return (
      <section className="mt-2 border-t border-white/8 pt-2">
        <SettingsSectionTitle>Bridge credentials</SettingsSectionTitle>
        <p className={`${hint} mb-2 px-0`}>
          Simpan credential per bridge, atau set env saat menjalankan bridge (
          <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
            GEMINI_API_KEY
          </code>
          ,{" "}
          <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
            CURSOR_API_KEY
          </code>
          ,{" "}
          <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
            OPENROUTER_API_KEY
          </code>
          ,{" "}
          <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
            NINEROUTER_BASE_URL
          </code>{" "}
          /{" "}
          <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
            NINEROUTER_API_KEY
          </code>
          ).
        </p>

        {bridges.length > 1 && (
          <SettingsRow label="Active bridge" description="Bridge used for chat">
            <Select
              className={controlWidth}
              value={selectedBridgeId}
              onChange={(e) => onSelectBridge(e.target.value)}
            >
              <option value="">— select —</option>
              {bridges.map((b) => (
                <option key={b.bridgeId} value={b.bridgeId}>
                  {b.bridgeLabel}
                </option>
              ))}
            </Select>
          </SettingsRow>
        )}

        <SettingsRowStacked
          label="Gemini API key"
          description={
            !geminiBridge ? "Gemini bridge offline — jalankan pnpm run start:bridge" : undefined
          }
        >
          <Input
            type="password"
            className={controlWidth}
            value={geminiKey}
            onChange={(e) => onGeminiKeyChange(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
            disabled={!geminiBridge}
          />
          <Button
            variant="default"
            onClick={onSaveGemini}
            disabled={!geminiBridge || !geminiKey.trim()}
          >
            Save to Gemini bridge
          </Button>
        </SettingsRowStacked>

        <SettingsRowStacked
          label="Cursor API key"
          description={!cursorBridge ? "Cursor bridge offline" : undefined}
        >
          <Input
            type="password"
            className={controlWidth}
            value={cursorKey}
            onChange={(e) => onCursorKeyChange(e.target.value)}
            placeholder="key_..."
            autoComplete="off"
            disabled={!cursorBridge}
          />
          <Button
            variant="default"
            onClick={onSaveCursor}
            disabled={!cursorBridge || !cursorKey.trim()}
          >
            Save to Cursor bridge
          </Button>
          {statusMessage && <p className={`${statusMessageClass} pb-2`}>{statusMessage}</p>}
        </SettingsRowStacked>

        <SettingsRowStacked
          label="OpenRouter API key"
          description={!openRouterBridge ? "OpenRouter bridge offline" : undefined}
        >
          <Input
            type="password"
            className={controlWidth}
            value={openRouterKey}
            onChange={(e) => onOpenRouterKeyChange(e.target.value)}
            placeholder="sk-or-..."
            autoComplete="off"
            disabled={!openRouterBridge}
          />
          <Button
            variant="default"
            onClick={onSaveOpenRouter}
            disabled={!openRouterBridge || !openRouterKey.trim()}
          >
            Save to OpenRouter bridge
          </Button>
        </SettingsRowStacked>

        <SettingsRowStacked
          label="9Router"
          description={
            !nineRouterBridge
              ? "9Router bridge offline — jalankan pnpm run start:bridge:ninerouter + app 9Router"
              : undefined
          }
        >
          <Input
            type="url"
            className={controlWidth}
            value={nineRouterBaseUrl}
            onChange={(e) => onNineRouterBaseUrlChange(e.target.value)}
            placeholder="http://localhost:20128"
            autoComplete="off"
            disabled={!nineRouterBridge}
          />
          <Input
            type="password"
            className={controlWidth}
            value={nineRouterKey}
            onChange={(e) => onNineRouterKeyChange(e.target.value)}
            placeholder="from 9Router dashboard"
            autoComplete="off"
            disabled={!nineRouterBridge}
          />
          <Button
            variant="default"
            onClick={onSaveNineRouter}
            disabled={!nineRouterBridge || !nineRouterBaseUrl.trim()}
          >
            Save to 9Router bridge
          </Button>
        </SettingsRowStacked>

        {selected && (
          <p className={`${hint} py-3`}>
            Chat bridge: {selected.bridgeLabel} — default model {selected.defaultModel ?? "—"}
          </p>
        )}
        {statusMessage && <p className={`${statusMessageClass} pb-2`}>{statusMessage}</p>}
      </section>
    );
  }

  const content = (
    <>
      <CardTitle>Bridge credentials</CardTitle>
      <p className={hint}>
        Simpan credential per bridge, atau set env saat menjalankan bridge (
        <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
          GEMINI_API_KEY
        </code>
        ,{" "}
        <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
          CURSOR_API_KEY
        </code>
        ,{" "}
        <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
          OPENROUTER_API_KEY
        </code>
        ,{" "}
        <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
          NINEROUTER_BASE_URL
        </code>{" "}
        /{" "}
        <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.85em] text-rose-400">
          NINEROUTER_API_KEY
        </code>
        ).
      </p>

      {bridges.length > 1 && (
        <Label>
          Active bridge (for chat)
          <Select value={selectedBridgeId} onChange={(e) => onSelectBridge(e.target.value)}>
            <option value="">— select —</option>
            {bridges.map((b) => (
              <option key={b.bridgeId} value={b.bridgeId}>
                {b.bridgeLabel}
              </option>
            ))}
          </Select>
        </Label>
      )}

      <div className="mt-4 grid gap-4">
        <Label>
          Gemini API key
          <Input
            type="password"
            value={geminiKey}
            onChange={(e) => onGeminiKeyChange(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
            disabled={!geminiBridge}
          />
          <Button variant="default" onClick={onSaveGemini} disabled={!geminiBridge || !geminiKey.trim()}>
            Save to Gemini bridge
          </Button>
          {!geminiBridge && (
            <span className={hint}>Gemini bridge offline — jalankan pnpm run start:bridge</span>
          )}
        </Label>

        <Label>
          Cursor API key
          <Input
            type="password"
            value={cursorKey}
            onChange={(e) => onCursorKeyChange(e.target.value)}
            placeholder="key_..."
            autoComplete="off"
            disabled={!cursorBridge}
          />
          <Button variant="default" onClick={onSaveCursor} disabled={!cursorBridge || !cursorKey.trim()}>
            Save to Cursor bridge
          </Button>
          {!cursorBridge && <span className={hint}>Cursor bridge offline</span>}
        </Label>

        <Label>
          OpenRouter API key
          <Input
            type="password"
            value={openRouterKey}
            onChange={(e) => onOpenRouterKeyChange(e.target.value)}
            placeholder="sk-or-..."
            autoComplete="off"
            disabled={!openRouterBridge}
          />
          <Button variant="default" onClick={onSaveOpenRouter} disabled={!openRouterBridge || !openRouterKey.trim()}>
            Save to OpenRouter bridge
          </Button>
          {!openRouterBridge && <span className={hint}>OpenRouter bridge offline</span>}
        </Label>

        <Label>
          9Router base URL
          <Input
            type="url"
            value={nineRouterBaseUrl}
            onChange={(e) => onNineRouterBaseUrlChange(e.target.value)}
            placeholder="http://localhost:20128"
            autoComplete="off"
            disabled={!nineRouterBridge}
          />
          9Router API key
          <Input
            type="password"
            value={nineRouterKey}
            onChange={(e) => onNineRouterKeyChange(e.target.value)}
            placeholder="from 9Router dashboard"
            autoComplete="off"
            disabled={!nineRouterBridge}
          />
          <Button
            variant="default"
            onClick={onSaveNineRouter}
            disabled={!nineRouterBridge || !nineRouterBaseUrl.trim()}
          >
            Save to 9Router bridge
          </Button>
          {!nineRouterBridge && (
            <span className={hint}>
              9Router bridge offline — jalankan pnpm run start:bridge:ninerouter + app 9Router
            </span>
          )}
        </Label>
      </div>

      {selected && (
        <p className={`${hint} mt-4`}>
          Chat bridge: {selected.bridgeLabel} — default model {selected.defaultModel ?? "—"}
        </p>
      )}
      {statusMessage && <p className={`${statusMessageClass} mt-2`}>{statusMessage}</p>}
    </>
  );

  return <Card>{content}</Card>;
}
