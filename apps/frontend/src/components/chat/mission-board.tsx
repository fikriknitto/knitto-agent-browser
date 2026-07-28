import type { AgentMission, MissionItem } from "@/lib/api/api-data-missions-api";
import { Button } from "@/components/chat/ui";
import { cn } from "@/lib/cn";
import type { ChatLine } from "@/types/automation";
import {
  deriveMissionItemStatuses,
  summarizeMissionRun,
} from "@/lib/utils/mission-run-progress";
import { useMemo } from "react";
import { CheckCircle2, ListTodo, Plus, RefreshCw, Trash2 } from "lucide-react";
import { MissionItemKindBadge, MissionItemKindToggle } from "./mission-item-kind-toggle";
import { MissionItemStatusIcon } from "./mission-item-status-icon";

type MissionBoardProps = {
  mission: AgentMission;
  busy?: boolean;
  suiteIdDraft: string;
  onSuiteIdDraftChange: (value: string) => void;
  onItemsChange: (items: MissionItem[]) => void;
  onReady: () => void;
  onApprove: () => void;
  onCancelMission: () => void;
  onSeedFromSuite: () => void;
  onAddTodo: () => void;
  onReplan: () => void;
  runProgressLine?: ChatLine;
  isRunning?: boolean;
  /** Full-height sidebar pane (scroll + sticky actions). */
  layout?: "sidebar" | "inline";
};

function missionItemCardClass(
  status: ReturnType<typeof deriveMissionItemStatuses>[number] | undefined,
  showStatus: boolean
): string {
  if (!showStatus || !status) return "";
  if (status === "running") return "mission-item--running";
  if (status === "completed") return "mission-item--done";
  if (status === "error") return "mission-item--failed";
  return "";
}

export function MissionBoard({
  mission,
  busy,
  suiteIdDraft,
  onSuiteIdDraftChange,
  onItemsChange,
  onReady,
  onApprove,
  onCancelMission,
  onSeedFromSuite,
  onAddTodo,
  onReplan,
  runProgressLine,
  isRunning = false,
  layout = "sidebar",
}: MissionBoardProps) {
  const editable = mission.status === "DRAFT" || mission.status === "READY";
  const items = mission.items ?? [];

  const progressLine = runProgressLine;

  const itemStatuses = useMemo(
    () => deriveMissionItemStatuses(items.length, progressLine),
    [items.length, progressLine]
  );

  const runSummary = useMemo(
    () => summarizeMissionRun(itemStatuses, progressLine),
    [itemStatuses, progressLine]
  );

  const showLiveStatus =
    mission.status === "APPROVED" &&
    (isRunning || runSummary.isTerminal || Boolean(progressLine?.testCaseResults?.length));

  const updateItem = (index: number, patch: Partial<MissionItem>) => {
    onItemsChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const progressHint = (() => {
    if (!showLiveStatus) return null;
    if (runSummary.isTerminal) {
      const parts: string[] = [];
      if (runSummary.passed) parts.push(`${runSummary.passed} passed`);
      if (runSummary.failed) parts.push(`${runSummary.failed} failed`);
      if (runSummary.skipped) parts.push(`${runSummary.skipped} skipped`);
      return parts.length ? `Selesai · ${parts.join(" · ")}` : "Selesai";
    }
    if (runSummary.running > 0 && runSummary.activeIndex != null) {
      return `Running ${runSummary.activeIndex + 1}/${runSummary.total}`;
    }
    if (isRunning) return "Menunggu worker…";
    return null;
  })();

  const header = (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-sm font-semibold text-black-100 dark:text-slate-100">
        <ListTodo className="size-4 shrink-0" />
        <span className="truncate">{mission.title || "Mission"}</span>
        <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-black-60 dark:bg-white/10 dark:text-slate-400">
          {mission.status}
        </span>
      </div>
      <p className="m-0 mt-0.5 text-xs text-black-40 dark:text-slate-500">
        id {mission.missionId}
        {mission.runId != null ? ` · run ${mission.runId}` : ""}
      </p>
      {progressHint ? (
        <p className="m-0 mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
          {progressHint}
        </p>
      ) : null}
    </div>
  );

  const actions = editable ? (
    <div className="mission-board-actions">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-start text-xs"
        disabled={busy}
        onClick={onReplan}
        title="Generate ulang todos via LLM (provider/model Config)"
      >
        <RefreshCw className="size-3.5" />
        Re-plan
      </Button>
      <div className="flex gap-1.5">
        <input
          type="number"
          min={1}
          placeholder="Suite id"
          value={suiteIdDraft}
          onChange={(e) => onSuiteIdDraftChange(e.target.value)}
          disabled={busy}
          className="h-8 min-w-0 flex-1 rounded-md border border-black/10 bg-black/5 px-2 text-xs dark:border-white/10 dark:bg-white/5"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-xs"
          disabled={busy}
          onClick={onSeedFromSuite}
        >
          Seed
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-start text-xs"
        disabled={busy}
        onClick={onAddTodo}
      >
        <Plus className="size-3.5" />
        Tambah todo
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-start text-xs"
        disabled={busy || items.length < 1}
        onClick={onReady}
      >
        Ready
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-8 w-full justify-start text-xs"
        disabled={busy || mission.status !== "READY"}
        onClick={onApprove}
      >
        <CheckCircle2 className="size-3.5" />
        Approve & Run
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-start text-xs text-red-600 dark:text-red-400"
        disabled={busy}
        onClick={onCancelMission}
      >
        Cancel mission
      </Button>
    </div>
  ) : showLiveStatus ? (
    <p className="m-0 px-1 text-xs text-black-60 dark:text-slate-400">
      Progress real-time di daftar todos di atas.
    </p>
  ) : (
    <p className="m-0 px-1 text-xs text-black-60 dark:text-slate-400">
      Mission terkunci — ikuti progress di chat.
    </p>
  );

  const itemList = (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.length === 0 ? (
        <li className="rounded-lg border border-dashed border-black/10 px-3 py-4 text-center text-xs text-black-40 dark:border-white/10 dark:text-slate-500">
          Belum ada todo. Tunggu LLM plan, atau Re-plan / tambah manual.
        </li>
      ) : (
        items.map((item, index) => {
          const runStatus = itemStatuses[index];
          const kind = item.kind === "checkpoint" ? "checkpoint" : "todo";

          return (
            <li
              key={item.itemId || `draft-${index}`}
              className={cn(
                "mission-item rounded-lg border border-black/8 bg-black/[0.02] p-2 dark:border-white/8 dark:bg-white/[0.03]",
                missionItemCardClass(runStatus, showLiveStatus)
              )}
            >
              <div className="mb-1.5 flex items-center gap-2">
                {showLiveStatus && runStatus ? (
                  <MissionItemStatusIcon status={runStatus} size="sm" />
                ) : null}
                <span className="text-[10px] font-semibold text-black-40 dark:text-slate-500">
                  #{index + 1}
                </span>
                {editable ? (
                  <MissionItemKindToggle
                    value={kind}
                    disabled={busy}
                    onChange={(next) =>
                      updateItem(index, {
                        kind: next,
                        requiresEvidence: next === "checkpoint",
                      })
                    }
                  />
                ) : (
                  <MissionItemKindBadge kind={kind} />
                )}
                {editable ? (
                  <button
                    type="button"
                    className="ml-auto text-black-40 hover:text-red-600 dark:text-slate-500"
                    disabled={busy}
                    onClick={() => removeItem(index)}
                    aria-label="Hapus item"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <input
                className="mb-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-transparent"
                disabled={!editable || busy}
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                placeholder="Judul todo"
              />
              <textarea
                className="min-h-[2.5rem] w-full resize-y rounded-md border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-transparent"
                disabled={!editable || busy}
                value={item.body ?? ""}
                onChange={(e) => updateItem(index, { body: e.target.value })}
                placeholder="Instruksi untuk agent"
              />
            </li>
          );
        })
      )}
    </ul>
  );

  if (layout === "sidebar") {
    return (
      <div className="mission-board-sidebar">
        <div className="mission-board-sidebar-header">{header}</div>
        <div className="automation-config-scroll mission-board-sidebar-scroll">{itemList}</div>
        <div className="mission-board-sidebar-footer">{actions}</div>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-xl border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-[rgba(12,14,22,0.7)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {header}
        <div className="flex flex-wrap items-center gap-1.5">{actions}</div>
      </div>
      {itemList}
    </div>
  );
}

export function MissionBoardEmpty() {
  return (
    <div className="mission-board-empty">
      <ListTodo className="size-8 text-black-20 dark:text-slate-600" aria-hidden />
      <p className="m-0 text-sm font-medium text-black-80 dark:text-slate-300">
        Belum ada mission
      </p>
      <p className="m-0 text-xs text-black-40 dark:text-slate-500">
        Susun mission dari composer di kanan — LLM akan mengisi todos di sini.
      </p>
    </div>
  );
}
