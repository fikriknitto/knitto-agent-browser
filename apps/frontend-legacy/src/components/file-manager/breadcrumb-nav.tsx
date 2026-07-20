import { splitPath } from "../../lib/file-utils";

type BreadcrumbNavProps = {
  path: string;
  onNavigate: (path: string) => void;
};

export function BreadcrumbNav({ path, onNavigate }: BreadcrumbNavProps) {
  const segments = splitPath(path);

  return (
    <nav className="flex flex-wrap items-center gap-0.5 text-sm text-slate-300 mt-3" aria-label="Lokasi folder">
      {segments.length > 0 &&
        <button
          type="button"
          className="cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-0.5 font-inherit text-blue-300 hover:bg-blue-500/12 hover:text-blue-200"
          onClick={() => onNavigate("")}
        >
          Home
        </button>
      }
      {segments.map((segment, index) => {
        const segmentPath = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        return (
          <span key={segmentPath} className="inline-flex items-center">
            <span className="mx-1 text-slate-500" aria-hidden="true">
              /
            </span>
            {isLast ? (
              <span className="px-1.5 py-0.5 font-medium text-slate-200">{segment}</span>
            ) : (
              <button
                type="button"
                className="cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-0.5 font-inherit text-blue-300 hover:bg-blue-500/12 hover:text-blue-200"
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
