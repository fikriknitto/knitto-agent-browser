import Portal from '@/components/ui/portal';
import { toggleSidebar } from '@/redux/layoutSlice';
import { RootState } from '@/redux/store';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from './header';
import Sidebar, { ISidebarMenu } from './sidebar';

export default function Layout({ sidebar, children }: { sidebar: ISidebarMenu[]; children: React.ReactNode }) {
  const sidebarIsOpen = useSelector((state: RootState) => state.layout.isSidebarOpen);

  return (
    <div className="size-full dark:bg-black-100">
      <Header sidebar={sidebar} />
      {sidebarIsOpen && <Backdrop />}
      <Sidebar sidebarMenu={sidebar} />
      <Content>{children}</Content>
    </div>
  );
}

const Content = React.memo(ContentMemoized);
function ContentMemoized({ children }: { children: React.ReactNode }) {
  return <div className="pt-[3.25rem] size-full dark:bg-black-100">{children}</div>;
}

function Backdrop() {
  const dispatch = useDispatch();
  return (
    <Portal>
      <div className="fixed z-[99] inset-0 bg-black/35" onClick={() => dispatch(toggleSidebar())} data-testid="backdrop"></div>
    </Portal>
  );
}
