import { useEffect, useState } from "react";
import { Button } from "@/components/chat/ui";
import {
  approveMdSuggestion,
  listMdSuggestions,
  rejectMdSuggestion,
  type MdSuggestion,
} from "@/lib/api/master-data-api";

// Inbox feedback loop (docs/plan/pipeline.md §Feedback loop, Langkah 7). Approve menulis
// entri md_* baru dari payload (lihat suggestions.use-case.ts di API Data); reject tidak
// menulis apa pun. Filter default: pending saja, biar tidak menumpuk histori lama.

export default function SettingsSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<MdSuggestion[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = async () => {
    try {
      setSuggestions(await listMdSuggestions("pending"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat suggestions");
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">Suggestions</h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Usulan pengayaan Master Data dari Discovery (BRD menyebut service baru) dan hasil
          eksekusi (endpoint/test data yang belum lengkap). Approve = langsung ditulis ke
          Master Data.
        </p>
      </div>

      {error && <p className="m-0 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
        <ul className="space-y-2">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2 text-xs dark:border-white/8"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 font-medium">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] uppercase dark:bg-white/10">
                    {s.targetType}
                  </span>{" "}
                  <span className="text-black-40 dark:text-slate-600">
                    dari {s.source === "from_generation" ? "discovery" : "hasil run"}
                  </span>
                </p>
                <p className="m-0 mt-1 truncate text-black-60 dark:text-slate-400">
                  {JSON.stringify(s.payload)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === s.id}
                  onClick={async () => {
                    setBusyId(s.id);
                    try {
                      await approveMdSuggestion(s.id);
                      await reload();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Gagal approve suggestion");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busyId === s.id}
                  onClick={async () => {
                    setBusyId(s.id);
                    try {
                      await rejectMdSuggestion(s.id);
                      await reload();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Gagal reject suggestion");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
          {suggestions.length === 0 && (
            <li className="text-xs italic text-black-40 dark:text-slate-600">
              Tidak ada suggestion pending.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
