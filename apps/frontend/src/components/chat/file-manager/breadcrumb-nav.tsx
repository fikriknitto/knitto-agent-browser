import { splitPath } from "@/lib/file-utils";

type BreadcrumbNavProps = {
  path: string;
  onNavigate: (path: string) => void;
};

export function BreadcrumbNav({ path, onNavigate }: BreadcrumbNavProps) {
  const segments = splitPath(path);

  return (
    <nav
      className="mt-3 flex flex-wrap items-center gap-0.5 text-sm text-black-60 dark:text-slate-300"
      aria-label="Lokasi folder"
    >
      <button
        type="button"
        className={
          segments.length === 0
            ? "rounded-md px-1.5 py-0.5 font-medium text-black-100 dark:text-slate-200"
            : "cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-0.5 font-inherit text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-500/12 dark:hover:text-blue-200"
        }
        disabled={segments.length === 0}
        onClick={() => onNavigate("")}
      >
        Home
      </button>
      {segments.map((segment, index) => {
        const segmentPath = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        return (
          <span key={segmentPath} className="inline-flex items-center">
            <span className="mx-1 text-black-40 dark:text-slate-500" aria-hidden="true">
              /
            </span>
            {isLast ? (
              <span className="px-1.5 py-0.5 font-medium text-black-100 dark:text-slate-200">
                {segment}
              </span>
            ) : (
              <button
                type="button"
                className="cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-0.5 font-inherit text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-500/12 dark:hover:text-blue-200"
                onClick={() => onNavigate(segmentPath)}
              >
                {segment}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
