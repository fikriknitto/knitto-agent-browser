import { RunHistoryView } from "@/components/history/run-history-view";

export default function HistoryPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">History</h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Daftar agent runs dari API Data, termasuk evidence screenshot/video.
        </p>
      </div>
      <RunHistoryView embedDetail />
    </div>
  );
}
