import { createContext, useContext } from 'react';

export interface ISidebarContext {
  activeMenu?: string;
  setActiveMenu?: (activeMenu: string) => void;
}

export const SidebarContext = createContext<ISidebarContext>({});

export const useSidebarContext = () => useContext(SidebarContext);
