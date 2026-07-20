import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import type { AppMemorySummary } from "@/lib/app-memory/types";
import {
  removeAppMemory,
  useAppMemoryList,
  type MemoryKind,
} from "@/hooks/app-memory/use-app-memories";
import { AppMemoryDeleteModal } from "./app-memory-delete-modal";
import { AppMemoryFormModal } from "./app-memory-form-modal";
import { Button } from "@/components/chat/ui";
import { cn } from "@/lib/cn";

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
  const [tab, setTab] = useState<MemoryKind>("browser");
  const list = useAppMemoryList(tab);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingMemory, setEditingMemory] = useState<AppMemorySummary | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<AppMemorySummary | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const memories = list.data;
  const toolPrefix = tab === "browser" ? "automation_get_app_memory" : "mobile_get_app_memory";
  const loadError = list.isError
    ? list.error?.message ?? "Gagal memuat app memory"
    : deleteError;

  const handleDelete = async () => {
    if (!deletingMemory) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await removeAppMemory(tab, deletingMemory.appId);
      setDeletingMemory(null);
      await list.refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus app memory");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-0.5">
            {(["browser", "mobile"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 text-xs capitalize transition-colors",
                  tab === value
                    ? "bg-white/15 text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                )}
                onClick={() => setTab(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="m-0 text-sm text-slate-500">
            {tab === "browser" ? "memory/" : "memory/mobile/"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingMemory(null);
            setFormMode("create");
          }}
        >
          <PlusIcon className="size-3.5" />
          Buat memory
        </Button>
      </div>

      <p className="m-0 pb-2 text-xs text-slate-600">
        appId dipakai di <code className="text-slate-400">{toolPrefix}</code>
      </p>

      {loadError && <p className="m-0 pb-2 text-sm text-red-400">{loadError}</p>}
      {list.isLoading && <p className="m-0 py-4 text-sm text-slate-500">Memuat…</p>}

      {!list.isLoading && memories.length === 0 ? (
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
                  onClick={() => {
                    setEditingMemory(memory);
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
        memoryKind={tab}
        open={formMode !== null}
        onClose={() => {
          setFormMode(null);
          setEditingMemory(null);
        }}
        onSaved={() => {
          setFormMode(null);
          setEditingMemory(null);
          void list.refetch();
        }}
      />

      <AppMemoryDeleteModal
        memory={deletingMemory}
        busy={deleting}
        onClose={() => setDeletingMemory(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
