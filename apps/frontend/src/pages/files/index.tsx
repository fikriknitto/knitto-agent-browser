import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { StorageEntry } from "@knitto/shared";
import { FileManagerPanel } from "@/components/chat/file-manager/file-manager-panel";
import type { FileSelectModifiers } from "@/components/chat/file-manager/file-card";
import { getApiDataToken } from "@/lib/api-data/token";

export default function FilesPage() {
  const [hasToken, setHasToken] = useState(() => Boolean(getApiDataToken()));
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setHasToken(Boolean(getApiDataToken()));
    sync();
    window.addEventListener("knitto-api-data-token", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("knitto-api-data-token", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleSelectEntry = useCallback(
    (entry: StorageEntry, _visible: StorageEntry[], modifiers: FileSelectModifiers) => {
      if (entry.type === "folder") return;
      setSelectedPaths((prev) => {
        if (modifiers.ctrlKey || modifiers.metaKey) {
          return prev.includes(entry.path)
            ? prev.filter((p) => p !== entry.path)
            : [...prev, entry.path];
        }
        return [entry.path];
      });
    },
    []
  );

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] flex-col gap-3 p-4 sm:p-6">
      <div className="shrink-0">
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">Media library</h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Sumber API Data / MinIO (`/agent/media`). Sama dengan lampiran di chat.
        </p>
      </div>

      {!hasToken ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-black/10 bg-white p-8 text-center dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
          <p className="m-0 text-sm text-black-80 dark:text-slate-300">
            Login API Data diperlukan untuk membuka media library.
          </p>
          <Link
            to="/login"
            className="inline-flex h-8 items-center rounded-md bg-[#0f163F] px-3 text-xs font-medium text-white shadow hover:bg-[#0f163F]/80"
          >
            Ke halaman login
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-white py-2 dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
          <FileManagerPanel
            enabled={hasToken}
            slotsLeft={999}
            attachedPaths={[]}
            selectedPaths={selectedPaths}
            selectError={null}
            selectionMode="manage"
            className="px-4"
            onSelectEntry={handleSelectEntry}
            onEntryDeleted={(path) => {
              setSelectedPaths((prev) =>
                prev.filter((p) => p !== path && !p.startsWith(`${path}/`))
              );
            }}
            onEntryRenamed={(oldPath, newPath) => {
              setSelectedPaths((prev) => prev.map((p) => (p === oldPath ? newPath : p)));
            }}
          />
        </div>
      )}
    </div>
  );
}
