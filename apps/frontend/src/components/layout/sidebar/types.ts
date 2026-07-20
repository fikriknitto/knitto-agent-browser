import { HTMLAttributes, ReactNode } from 'react';

export interface ISidebar extends HTMLAttributes<HTMLDivElement> {
  sidebarMenu: ISidebarMenu[];
  hideSearch?: boolean;
}

export interface ISidebarSection {
  module?: string;
  menu: ISidebarMenuItem[];
}

export interface ISidebarSectionItem {
  item: ISidebarMenuItem;
  level: number;
  paddingLeft?: number;
  isLastMenu?: boolean;
}

export interface ISidebarMenuItem {
  label: string;
  url?: string;
  customUrl?: string;
  icon?: ReactNode;
  element?: ReactNode;
  children?: ISidebarMenuItem[];
}

export interface ISidebarMenu {
  module?: string;
  menu: ISidebarMenuItem[];
}
