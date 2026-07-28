import { ISidebarMenu, ISidebarMenuItem } from './types';

const isActivePath = (url: string | undefined, pathname: string): boolean => {
  if (!url) return false;
  // Home must be exact — avoid matching every path that happens to end with "/".
  if (url === "/") return pathname === "/";
  const normalized = url.replace(/^\//, "");
  if (!normalized) return pathname === "/";
  return pathname === `/${normalized}` || pathname.endsWith(`/${normalized}`);
};

export const hasActiveChild = (item: ISidebarMenuItem, pathname: string): boolean => {
  if (item.url && isActivePath(item.url, pathname)) return true;

  if (item.children) {
    return item.children.some((child) => hasActiveChild(child, pathname));
  }

  return false;
};

export function searchSidebarData(query: string, data: ISidebarMenu[]): ISidebarMenu[] {
  if (!query.trim()) return data;
  const lowerQuery = query.toLowerCase();

  function filterMenu(menu: ISidebarMenuItem[]): ISidebarMenuItem[] {
    const result: ISidebarMenuItem[] = [];

    for (const item of menu) {
      const isMatch = item.label.toLowerCase().includes(lowerQuery);
      const filteredChildren = item.children ? filterMenu(item.children) : [];

      if (isMatch || filteredChildren.length > 0) {
        result.push({
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        });
      }
    }

    return result;
  }

  return data
    .map((module) => {
      const filteredMenu = filterMenu(module.menu);

      if (filteredMenu.length > 0) {
        return {
          ...module,
          menu: filteredMenu,
        };
      }

      return null;
    })
    .filter(Boolean) as ISidebarMenu[];
}
