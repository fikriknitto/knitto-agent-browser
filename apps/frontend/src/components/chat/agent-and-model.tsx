import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { cn } from "@/lib/cn";
import type { BridgeSummary, ConnectionState } from "@/lib/types";
import { useUserLogin } from "@/lib/hooks/use-user-login";
import { useListCredentialsQuery } from "@/redux/api/aiProviderCredentials";
import type { RootState } from "@/redux/store";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "./ui/combobox";

type ComboboxOption = { value: string; label: string };

const pillTriggerClass =
  "inline-flex h-6! max-w-full min-w-0 items-center gap-1 rounded-2xl! border border-black/10 bg-black/5 px-2.5 text-xs text-black-80 shadow-none outline-none transition hover:bg-black/8 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-white/12 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-black-40 dark:[&_svg]:text-slate-500";

const searchInPopupClass =
  "mb-0! mt-1! ml-1! mr-1! h-8! w-[calc(100%-0.5rem)]! max-w-none! rounded-md! border border-black/10 bg-black/5 text-sm text-black-100 shadow-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100 [&_input]:h-8 [&_input]:px-2.5 [&_input]:text-sm";

type PillComboboxProps = {
  ariaLabel: string;
  placeholder: string;
  items: ComboboxOption[];
  value: ComboboxOption | null;
  disabled?: boolean;
  className?: string;
  emptyText: string;
  /** Search field di dalam dropdown (cocok untuk list panjang seperti model). */
  searchable?: boolean;
  searchPlaceholder?: string;
  onValueChange: (value: string) => void;
};

function PillCombobox({
  ariaLabel,
  placeholder,
  items,
  value,
  disabled,
  className,
  emptyText,
  searchable = false,
  searchPlaceholder = "Cari…",
  onValueChange,
}: PillComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchProps = searchable
    ? {
        open,
        onOpenChange: (nextOpen: boolean) => {
          setOpen(nextOpen);
          if (nextOpen) setSearchQuery("");
        },
        inputValue: searchQuery,
        onInputValueChange: (next: string) => setSearchQuery(next),
      }
    : {};

  return (
    <Combobox
      items={items}
      value={value}
      disabled={disabled}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
      onValueChange={(item) => onValueChange(item?.value ?? "")}
      {...searchProps}
    >
      {/* Always use Trigger+Value so the selected label shows (Input alone stays on placeholder). */}
      <ComboboxTrigger
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(pillTriggerClass, className)}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <ComboboxValue placeholder={placeholder} />
        </span>
      </ComboboxTrigger>
      <ComboboxContent className={searchable ? "min-w-[18rem] max-w-[min(90vw,24rem)]" : undefined}>
        {searchable ? (
          <ComboboxInput
            aria-label={`Cari ${ariaLabel.toLowerCase()}`}
            placeholder={searchPlaceholder}
            disabled={disabled}
            showTrigger={false}
            showClear={false}
            className={searchInPopupClass}
          />
        ) : null}
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: ComboboxOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type AgentAndModelProps = {
  connectionState: ConnectionState;
  bridges: BridgeSummary[];
  selectedBridgeId: string;
  selectedModel: string;
  disabled?: boolean;
  /** `stack` = full-width stacked fields (config panel); `inline` = compact pills. */
  layout?: "inline" | "stack";
  onSelectBridge: (id: string) => void;
  onSelectModel: (id: string) => void;
};

export function resolveModelForAgent(
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

export function AgentAndModel({
  connectionState,
  bridges,
  selectedBridgeId,
  selectedModel,
  disabled,
  layout = "inline",
  onSelectBridge,
  onSelectModel,
}: AgentAndModelProps) {
  const productAgents = useMemo(
    () =>
      bridges.filter((b) => b.bridgeKind === "cursor" || b.bridgeKind === "openai"),
    [bridges]
  );
  const bridge = productAgents.find((b) => b.bridgeId === selectedBridgeId);
  const model = resolveModelForAgent(bridge, selectedModel);
  const models = bridge?.models ?? [];
  const isStack = layout === "stack";

  // Readiness: an OpenAI-compatible provider whose saved credential test
  // never passed (untested/failed) is still shown & selectable, just not
  // implied to be a verified-working connection (see `agent-and-model.tsx`
  // requirement in the settings integration plan).
  const { authorized } = useUserLogin();
  const { data: credentials } = useListCredentialsQuery(undefined, { skip: !authorized });
  // Match by the provider's saved API Data credential id (persisted on the
  // provider itself, `remoteId`) rather than a bridgeLabel<->name string
  // match — that string match silently fails whenever a provider is renamed
  // after saving, has different casing/whitespace, or was tested but never
  // matched a stale name, leaving verified providers stuck showing
  // "(unverified)".
  const openaiProviders = useSelector((s: RootState) => s.connection.openaiProviders);

  const agentItems = useMemo(
    () =>
      productAgents.map((b) => {
        if (b.bridgeKind !== "openai") return { value: b.bridgeId, label: b.bridgeLabel };
        const remoteId = openaiProviders.find((p) => p.id === b.bridgeId)?.remoteId;
        const cred = remoteId != null ? credentials?.find((c) => c.id === remoteId) : undefined;
        const verified = cred?.connectionStatus === "connected";
        return {
          value: b.bridgeId,
          label: verified ? b.bridgeLabel : `${b.bridgeLabel} (unverified)`,
        };
      }),
    [productAgents, credentials, openaiProviders]
  );

  const modelItems = useMemo(
    () => models.map((m) => ({ value: m.id, label: m.label })),
    [models]
  );

  const selectedAgentItem = useMemo(
    () => agentItems.find((item) => item.value === selectedBridgeId) ?? null,
    [agentItems, selectedBridgeId]
  );

  const selectedModelItem = useMemo(
    () => modelItems.find((item) => item.value === model) ?? null,
    [modelItems, model]
  );

  const stackFieldClass =
    "inline-flex h-9! w-full min-w-0 items-center gap-1 rounded-lg! border border-black/10 bg-black/5 px-2.5 text-sm text-black-100 shadow-none outline-none transition hover:bg-black/8 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12 [&_svg]:size-4 [&_svg]:shrink-0";

  if (isStack) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-2.5">
        <div className="space-y-1">
          <span className="text-xs font-medium text-black-40 dark:text-slate-500">Provider</span>
          <PillCombobox
            ariaLabel="Agent"
            placeholder="Pilih agent…"
            items={agentItems}
            value={selectedAgentItem}
            disabled={disabled || connectionState !== "connected"}
            className={stackFieldClass}
            emptyText="Agent tidak ditemukan."
            onValueChange={onSelectBridge}
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-black-40 dark:text-slate-500">Model</span>
          <PillCombobox
            key={selectedBridgeId || "no-agent"}
            ariaLabel="Model"
            placeholder="Pilih model…"
            items={modelItems}
            value={selectedModelItem}
            disabled={disabled || !models.length || connectionState !== "connected"}
            className={stackFieldClass}
            emptyText="Model tidak ditemukan."
            searchable
            searchPlaceholder="Cari model…"
            onValueChange={onSelectModel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <PillCombobox
        ariaLabel="Agent"
        placeholder="Agent"
        items={agentItems}
        value={selectedAgentItem}
        disabled={disabled || connectionState !== "connected"}
        className="max-w-36"
        emptyText="Agent tidak ditemukan."
        onValueChange={onSelectBridge}
      />
      <PillCombobox
        key={selectedBridgeId || "no-agent"}
        ariaLabel="Model"
        placeholder="Pilih model…"
        items={modelItems}
        value={selectedModelItem}
        disabled={disabled || !models.length || connectionState !== "connected"}
        className="max-w-52"
        emptyText="Model tidak ditemukan."
        searchable
        searchPlaceholder="Cari model…"
        onValueChange={onSelectModel}
      />
    </div>
  );
}
