import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import type { AppMemorySummary } from "@/lib/app-memory/types";
import { useDeleteAppMemory } from "@/hooks/app-memory/use-app-memory-mutations";
import { useAppMemories } from "@/hooks/app-memory/use-app-memories";
import { AppMemoryDeleteModal } from "./app-memory-delete-modal";
import { AppMemoryFormModal } from "./app-memory-form-modal";
import { Button } from "./ui";

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AppMemorySettings() {
  const { data: memories = [], isError, error } = useAppMemories();
  const deleteMutation = useDeleteAppMemory();
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingMemory, setEditingMemory] = useState<AppMemorySummary | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<AppMemorySummary | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const loadError = isError
    ? error instanceof Error
      ? error.message
      : "Gagal memuat app memory"
    : deleteError;

  const openCreate = () => {
    setEditingMemory(null);
    setFormMode("create");
  };

  const openEdit = (memory: AppMemorySummary) => {
    setEditingMemory(memory);
    setFormMode("edit");
  };

  const handleDelete = async () => {
    if (!deletingMemory) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(deletingMemory.appId);
      setDeletingMemory(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus app memory");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 pb-2">
        <p className="m-0 text-sm text-slate-500">
          Kelola file pengetahuan agent di folder memory. appId dipakai di{" "}
          <code className="text-slate-400">automation_get_app_memory</code>.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <PlusIcon className="size-3.5" />
          Buat memory
        </Button>
      </div>

      {loadError && <p className="m-0 pb-2 text-sm text-red-400">{loadError}</p>}

      {memories.length === 0 ? (
        <p className="m-0 py-6 text-center text-sm text-slate-500">Belum ada file memory.</p>
      ) : (
        <div className="divide-y divide-white/8">
          {memories.map((memory) => (
            <div key={memory.appId} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm font-medium text-slate-100">
                  {memory.appId}
                </div>
                {memory.preview ? (
                  <p className="m-0 mt-1 line-clamp-2 text-xs text-slate-500">{memory.preview}</p>
                ) : (
                  <p className="m-0 mt-1 text-xs text-slate-600 italic">Kosong</p>
                )}
                <p className="m-0 mt-1 text-xs text-slate-600">
                  Diperbarui {formatUpdatedAt(memory.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${memory.appId}`}
                  onClick={() => openEdit(memory)}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-400 hover:text-red-300"
                  aria-label={`Hapus ${memory.appId}`}
                  onClick={() => setDeletingMemory(memory)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppMemoryFormModal
        mode={formMode === "edit" ? "edit" : "create"}
        memory={editingMemory}
        open={formMode !== null}
        onClose={() => setFormMode(null)}
        onSaved={() => setFormMode(null)}
      />

      <AppMemoryDeleteModal
        memory={deletingMemory}
        busy={deleteMutation.isPending}
        onClose={() => setDeletingMemory(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
