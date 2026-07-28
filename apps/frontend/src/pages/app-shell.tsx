import Layout from "@/components/layout";
import type { ISidebarMenu, ISidebarMenuItem } from "@/components/layout/sidebar";
import { useUserLogin } from "@/lib/hooks/use-user-login";
import { env } from "@/lib/variables/env";
import loadable from "@loadable/component";
import { Suspense, useEffect, useMemo, useState, type ComponentType, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

const AutomationPage = loadable(() => import("./automation")) as ComponentType;
const HistoryPage = loadable(() => import("./history")) as ComponentType;
const HistoryDetailPage = loadable(() => import("./history/detail")) as ComponentType;
const SettingsPage = loadable(() => import("./settings")) as ComponentType;
const SettingsMemoryPage = loadable(() => import("./settings/memory")) as ComponentType;
const SettingsShortcutsPage = loadable(() => import("./settings/shortcuts")) as ComponentType;
const SettingsMasterDataPage = loadable(() => import("./settings/master-data")) as ComponentType;
const SettingsRequirementsPage = loadable(() => import("./settings/requirements")) as ComponentType;
const SettingsSuggestionsPage = loadable(() => import("./settings/suggestions")) as ComponentType;
const FilesPage = loadable(() => import("./files")) as ComponentType;

// Pipeline generate test case (qa_*/md_*) — lihat docs/plan/README.md. Default off.
const featureQaGenEnabled = env.VITE_FEATURE_QA_GEN === "true";

export default function AppShell() {
  const navigate = useNavigate();
  const { authorized, unauthorized } = useUserLogin();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Defer gate until after mount so cookie/localStorage is readable consistently.
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (unauthorized) navigate("/login", { replace: true });
  }, [sessionReady, unauthorized, navigate]);

  const sidebar = useMemo(
    () =>
      [
        {
          module: "Agent Automation",
          menu: [
            { label: "Automation", url: "/", element: <AutomationPage /> },
            { label: "History", url: "history", element: <HistoryPage /> },
            {
              label: "Settings",
              children: [
                { label: "Connection & Agents", url: "settings", element: <SettingsPage /> },
                { label: "App Memory", url: "settings/memory", element: <SettingsMemoryPage /> },
                {
                  label: "Prompt Shortcuts",
                  url: "settings/shortcuts",
                  element: <SettingsShortcutsPage />,
                },
                ...(featureQaGenEnabled
                  ? [
                      {
                        label: "Master Data",
                        url: "settings/master-data",
                        element: <SettingsMasterDataPage />,
                      },
                      {
                        label: "Requirements & Generation",
                        url: "settings/requirements",
                        element: <SettingsRequirementsPage />,
                      },
                      {
                        label: "Suggestions",
                        url: "settings/suggestions",
                        element: <SettingsSuggestionsPage />,
                      },
                    ]
                  : []),
              ],
            },
            { label: "File Manager", url: "files", element: <FilesPage /> },
          ],
        },
      ] as ISidebarMenu[],
    []
  );

  if (!sessionReady || !authorized) {
    return <div className="p-6 text-sm opacity-70">Checking session…</div>;
  }

  return (
    <Layout sidebar={sidebar}>
      <Suspense fallback={<div className="p-4 text-sm opacity-70">Loading…</div>}>
        <Routes>
          <Route path="/" element={<AutomationPage />} />
          <Route path="history/:runId" element={<HistoryDetailPage />} />
          {sidebar.flatMap((section) => renderRoutesFromMenu(section.menu))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function renderRoutesFromMenu(menuItems: ISidebarMenuItem[]): ReactElement[] {
  const routes: ReactElement[] = [];

  function recurse(items: ISidebarMenuItem[]) {
    items.forEach((item) => {
      if (item.url && item.url !== "/" && item.element && !item.customUrl) {
        routes.push(<Route key={item.url} path={item.url} element={item.element} />);
      }
      if (item?.children && item.children.length > 0) {
        recurse(item.children);
      }
    });
  }

  recurse(menuItems);
  return routes;
}
