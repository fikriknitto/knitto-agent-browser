import { FileText, Plug, XIcon } from "lucide-react";

import { useEffect, useState, type ReactNode } from "react";

import { createPortal } from "react-dom";



import { cn } from "@/lib/cn";

import { Button } from "./ui";



type SettingsTab = "connection" | "templates" | "memory";



type SettingsModalProps = {

  open: boolean;

  onClose: () => void;

  connection: ReactNode;

  templates: ReactNode;

  memory: ReactNode;

};



const NAV_ITEMS: { id: SettingsTab; label: string; shortLabel: string; icon: typeof Plug }[] = [

  { id: "connection", label: "Connection & Credential", shortLabel: "Connection", icon: Plug },

  { id: "templates", label: "Template Prompt", shortLabel: "Templates", icon: FileText },

  // { id: "memory", label: "Kelola Memory", shortLabel: "Memory", icon: Brain },

];



const TAB_TITLES: Record<SettingsTab, string> = {

  connection: "Connection & Credential",

  templates: "Template Prompt",

  memory: "Kelola Memory",

};



function renderTabContent(

  activeTab: SettingsTab,

  connection: ReactNode,

  templates: ReactNode,

  memory: ReactNode

): ReactNode {

  if (activeTab === "connection") return connection;

  if (activeTab === "templates") return templates;

  return memory;

}



export function SettingsModal({

  open,

  onClose,

  connection,

  templates,

  memory,

}: SettingsModalProps) {

  const [activeTab, setActiveTab] = useState<SettingsTab>("connection");



  useEffect(() => {

    if (!open) return;



    const onKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") {

        event.preventDefault();

        onClose();

      }

    };



    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";



    return () => {

      document.removeEventListener("keydown", onKeyDown);

      document.body.style.overflow = prevOverflow;

    };

  }, [open, onClose]);



  if (!open) return null;



  return createPortal(

    <div

      className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-4"

      role="presentation"

    >

      <button

        type="button"

        className="absolute inset-0 bg-black/70 backdrop-blur-sm"

        aria-label="Close settings"

        onClick={onClose}

      />

      <div

        className="relative z-[1] flex h-[min(92vh,680px)] w-[min(92vw,880px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#212121] shadow-2xl md:flex-row"

        role="dialog"

        aria-modal="true"

        aria-label="Settings"

        onClick={(e) => e.stopPropagation()}

      >

        {/* Mobile tab bar */}

        <div className="flex shrink-0 gap-1 border-b border-white/8 p-2 md:hidden">

          {NAV_ITEMS.map(({ id, shortLabel, icon: Icon }) => (

            <button

              key={id}

              type="button"

              className={cn(

                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs text-slate-400 transition",

                activeTab === id && "bg-white/10 text-slate-100"

              )}

              onClick={() => setActiveTab(id)}

            >

              <Icon className="size-3.5 shrink-0" aria-hidden />

              <span className="truncate">{shortLabel}</span>

            </button>

          ))}

          <Button

            type="button"

            variant="ghost"

            size="icon-sm"

            className="shrink-0"

            aria-label="Close settings"

            onClick={onClose}

          >

            <XIcon className="size-4" />

          </Button>

        </div>



        {/* Desktop sidebar */}

        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-white/8 bg-[#171717] md:flex">

          <div className="p-3">

            <Button

              type="button"

              variant="ghost"

              size="icon-sm"

              className="rounded-lg"

              aria-label="Close settings"

              onClick={onClose}

            >

              <XIcon className="size-4" />

            </Button>

          </div>

          <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">

            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (

              <button

                key={id}

                type="button"

                className={cn(

                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 transition",

                  activeTab === id && "bg-white/10 text-slate-100"

                )}

                onClick={() => setActiveTab(id)}

              >

                <Icon className="size-4 shrink-0" aria-hidden />

                <span className="leading-snug">{label}</span>

              </button>

            ))}

          </nav>

        </aside>



        {/* Content panel */}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          <header className="hidden shrink-0 border-b border-white/8 px-6 py-5 md:block">

            <h2 className="text-xl font-semibold text-slate-100">{TAB_TITLES[activeTab]}</h2>

          </header>

          <header className="shrink-0 border-b border-white/8 px-4 py-3 md:hidden">

            <h2 className="text-lg font-semibold text-slate-100">{TAB_TITLES[activeTab]}</h2>

          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6 sm:py-4">

            {renderTabContent(activeTab, connection, templates, memory)}

          </div>

        </div>

      </div>

    </div>,

    document.body

  );

}

