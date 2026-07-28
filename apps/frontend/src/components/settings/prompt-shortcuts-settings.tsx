import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import type { PromptShortcut } from "@/lib/prompt-shortcuts";
import { cn } from "@/lib/cn";
import {
  removePromptShortcut,
  usePromptShortcuts,
} from "@/hooks/prompt-shortcuts/use-prompt-shortcuts";
import {
  DeletePromptShortcutModal,
  PromptShortcutFormModal,
} from "./prompt-shortcut-form-modal";
import { Button } from "@/components/chat/ui";
import type { RootState } from "@/redux/store";

const variantClasses: Record<PromptShortcut["variant"], string> = {
  blue: "text-blue-700 dark:text-blue-300",
  green: "text-emerald-700 dark:text-emerald-200",
  amber: "text-amber-800 dark:text-yellow-300",
  neutral: "text-black-80 dark:text-slate-300",
};

export function PromptShortcutsSettings() {
  const { selectedBridgeId, selectedModel, connectionState } = useSelector(
    (s: RootState) => s.connection
  );
  const { data: shortcuts = [], isError, error, isLoading, refetch } = usePromptShortcuts();
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<PromptShortcut | null>(null);
  const [deletingShortcut, setDeletingShortcut] = useState<PromptShortcut | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadError = isError
    ? error instanceof Error
      ? error.message
      : "Gagal memuat prompt shortcuts"
    : deleteError;

  const canGenerate =
    connectionState === "connected" && Boolean(selectedBridgeId) && Boolean(selectedModel);

  const handleDelete = async () => {
    if (!deletingShortcut) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await removePromptShortcut(deletingShortcut.id);
      setDeletingShortcut(null);
      await refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus prompt shortcut");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 pb-2">
        <p className="m-0 text-sm text-black-40 dark:text-slate-500">
          Kelola template prompt yang tersedia di composer.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingShortcut(null);
            setFormMode("create");
          }}
        >
          <PlusIcon className="size-3.5" />
          Buat template
        </Button>
      </div>

      {loadError && <p className="m-0 pb-2 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      {isLoading && <p className="m-0 py-4 text-sm text-black-40 dark:text-slate-500">Memuat…</p>}

      {!isLoading && shortcuts.length === 0 ? (
        <p className="m-0 py-6 text-center text-sm text-black-40 dark:text-slate-500">Belum ada prompt shortcut.</p>
      ) : (
        <div className="divide-y divide-black/10 dark:divide-white/8">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div
                  className={cn("truncate text-sm font-medium", variantClasses[shortcut.variant])}
                >
                  {shortcut.icon ? `${shortcut.icon} ` : ""}
                  {shortcut.label}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${shortcut.label}`}
                  onClick={() => {
                    setEditingShortcut(shortcut);
                    setFormMode("edit");
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-400 hover:text-red-300"
                  aria-label={`Hapus ${shortcut.label}`}
                  onClick={() => setDeletingShortcut(shortcut)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromptShortcutFormModal
        mode={formMode === "edit" ? "edit" : "create"}
        shortcut={editingShortcut}
        open={formMode !== null}
        selectedBridgeId={selectedBridgeId}
        selectedModel={selectedModel}
        canGenerate={canGenerate}
        onClose={() => setFormMode(null)}
        onSaved={() => {
          setFormMode(null);
          void refetch();
        }}
      />

      <DeletePromptShortcutModal
        shortcut={deletingShortcut}
        busy={deleting}
        onClose={() => setDeletingShortcut(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
