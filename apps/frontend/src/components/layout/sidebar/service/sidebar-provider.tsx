import { ISidebarContext, SidebarContext } from './sidebar-context';

interface Props {
  children: React.ReactNode;
  value: ISidebarContext;
}

export default function SidebarProvier({ value, children }: Props) {
  return <SidebarContext.Provider value={{ ...value }}>{children}</SidebarContext.Provider>;
}
