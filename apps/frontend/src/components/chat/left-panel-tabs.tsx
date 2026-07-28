import { cn } from "@/lib/cn";
import { ListTodo, Settings2 } from "lucide-react";

export type LeftPanelTab = "config" | "mission";

type LeftPanelTabsProps = {
  value: LeftPanelTab;
  onChange: (tab: LeftPanelTab) => void;
  missionActive?: boolean;
  className?: string;
};

export function LeftPanelTabs({
  value,
  onChange,
  missionActive,
  className,
}: LeftPanelTabsProps) {
  return (
    <div
      className={cn("left-panel-tabs", className)}
      role="tablist"
      aria-label="Panel kiri"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "config"}
        className={cn("left-panel-tab", value === "config" && "left-panel-tab--active")}
        onClick={() => onChange("config")}
      >
        <Settings2 className="size-3.5 shrink-0" aria-hidden />
        Config
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "mission"}
        className={cn("left-panel-tab", value === "mission" && "left-panel-tab--active")}
        onClick={() => onChange("mission")}
      >
        <ListTodo className="size-3.5 shrink-0" aria-hidden />
        Mission
        {missionActive ? (
          <span className="left-panel-tab-dot" aria-hidden />
        ) : null}
      </button>
    </div>
  );
}
