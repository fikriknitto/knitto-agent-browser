import { useCallback, useEffect, useState } from "react";
import {
  deletePromptShortcut,
  fetchPromptShortcuts,
  type PromptShortcut,
} from "../lib/prompt-shortcuts";
import type { ConnectionState } from "../lib/types";
import {
  DeletePromptShortcutModal,
  PromptShortcutFormModal,
} from "./prompt-shortcut-form-modal";
import { PromptShortcutItem } from "./prompt-shortcut-item";
import { Button } from "./ui";

type PromptShortcutsPanelProps = {
  disabled?: boolean;
  selectedBridgeId: string;
  selectedModel: string;
  connectionState: ConnectionState;
  onApply: (text: string) => void;
};

export function PromptShortcutsPanel({
  disabled,
  selectedBridgeId,
  selectedModel,
  connectionState,
  onApply,
}: PromptShortcutsPanelProps) {
  const [shortcuts, setShortcuts] = useState<PromptShortcut[]>([]);
  const [manageMode, setManageMode] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<PromptShortcut | null>(null);
  const [deletingShortcut, setDeletingShortcut] = useState<PromptShortcut | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    try {
      const items = await fetchPromptShortcuts();
      setShortcuts(items);
      setLoadError("");
    } catch (err) {
      setShortcuts([]);
      setLoadError(err instanceof Error ? err.message : "Gagal memuat prompt shortcuts");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const canGenerate =
    connectionState === "connected" && Boolean(selectedBridgeId) && Boolean(selectedModel);

  const openCreate = () => {
    setEditingShortcut(null);
    setFormMode("create");
  };

  const openEdit = (shortcut: PromptShortcut) => {
    setEditingShortcut(shortcut);
    setFormMode("edit");
  };

  const handleDelete = async () => {
    if (!deletingShortcut) return;
    setDeleteBusy(true);
    try {
      await deletePromptShortcut(deletingShortcut.id);
      setDeletingShortcut(null);
      await reload();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal menghapus prompt shortcut");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">Prompt shortcuts</span>
          <div className="flex shrink-0 gap-1">
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={openCreate}>
              + Buat
            </Button>
            <Button
              type="button"
              size="sm"
              variant={manageMode ? "primary" : "ghost"}
              disabled={disabled}
              onClick={() => setManageMode((v) => !v)}
            >
              {manageMode ? "Selesai" : "Kelola"}
            </Button>
          </div>
        </div>

        {loadError && <p className="m-0 text-xs text-red-400">{loadError}</p>}

        {shortcuts.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">Belum ada prompt shortcut.</p>
        ) : (
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shortcuts.map((shortcut) => (
              <PromptShortcutItem
                key={shortcut.id}
                shortcut={shortcut}
                manageMode={manageMode}
                disabled={disabled}
                onApply={onApply}
                onEdit={openEdit}
                onDelete={setDeletingShortcut}
              />
            ))}
          </div>
        )}
      </div>

      <PromptShortcutFormModal
        mode={formMode === "edit" ? "edit" : "create"}
        shortcut={editingShortcut}
        open={formMode !== null}
        busy={formBusy}
        selectedBridgeId={selectedBridgeId}
        selectedModel={selectedModel}
        canGenerate={canGenerate}
        onClose={() => setFormMode(null)}
        onSaved={() => void reload()}
        onBusyChange={setFormBusy}
      />

      <DeletePromptShortcutModal
        shortcut={deletingShortcut}
        busy={deleteBusy}
        onClose={() => setDeletingShortcut(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
