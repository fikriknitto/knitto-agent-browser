import Layout from '@/components/layout';
import type { ISidebarMenu, ISidebarMenuItem } from '@/components/layout/sidebar';
import loadable from '@loadable/component';
import type { ComponentType, ReactElement } from 'react';
import { Suspense, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const AutomationPage = loadable(() => import('./automation')) as ComponentType;
const HistoryPage = loadable(() => import('./history')) as ComponentType;
const SettingsPage = loadable(() => import('./settings')) as ComponentType;
const SettingsMemoryPage = loadable(() => import('./settings/memory')) as ComponentType;
const SettingsShortcutsPage = loadable(() => import('./settings/shortcuts')) as ComponentType;
const FilesPage = loadable(() => import('./files')) as ComponentType;

export default function AppShell() {
  const sidebar = useMemo(
    () =>
      [
        {
          module: 'Agent Automation',
          menu: [
            { label: 'Automation', url: '', element: <AutomationPage /> },
            { label: 'History', url: 'history', element: <HistoryPage /> },
            {
              label: 'Settings',
              children: [
                { label: 'Connection & Agents', url: 'settings', element: <SettingsPage /> },
                { label: 'App Memory', url: 'settings/memory', element: <SettingsMemoryPage /> },
                {
                  label: 'Prompt Shortcuts',
                  url: 'settings/shortcuts',
                  element: <SettingsShortcutsPage />,
                },
              ],
            },
            { label: 'File Manager', url: 'files', element: <FilesPage /> },
          ],
        },
      ] as ISidebarMenu[],
    []
  );

  return (
    <Layout sidebar={sidebar}>
      <Suspense fallback={<div className="p-4 text-sm opacity-70">Loading…</div>}>
        <Routes>
          <Route path="/" element={<AutomationPage />} />
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
      if (item.url && item.element && !item.customUrl) {
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
