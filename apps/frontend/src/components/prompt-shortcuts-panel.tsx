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
import { Button, Card, CardTitle } from "./ui";

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
      <Card className="-mt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 p-2">
          <CardTitle>Knitto Shortcuts</CardTitle>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={openCreate}>
              + Buat shortcut
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

        {loadError && <p className="px-2 pb-2 text-sm text-red-400">{loadError}</p>}

        {shortcuts.length === 0 ? (
          <p className="px-2 pb-3 text-sm text-slate-500">Belum ada prompt shortcut.</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2 px-2 pb-3">
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
      </Card>

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
