import { memo, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { RootState } from '@/redux/store';
import { searchSidebarData } from './utils';
import { ISidebar } from './types';
import SidebarProvier from './service/sidebar-provider';
import InputSearch from '@/components/ui/inputs/input-search';
import { Typography } from '@knittotextile/react-ui';
import SearchIcon from '@/components/ui/icon/search';
import SidebarSection from './sidebar-section';

const Sidebar = ({ sidebarMenu, hideSearch, className, ...props }: ISidebar) => {
  const sidebarIsOpen = useSelector((state: RootState) => state.layout.isSidebarOpen);
  const [search, setSearch] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<string>('');

  const filteredMenu = useMemo(() => {
    return searchSidebarData(search, sidebarMenu);
  }, [search, sidebarMenu]);

  return (
    <SidebarProvier value={{ activeMenu, setActiveMenu }}>
      <div
        data-testid="sidebar"
        data-open={sidebarIsOpen}
        className={clsx(
          'w-62.5 pt-[.625rem] bg-white dark:bg-black-80 shadow-md overflow-auto scrollbar',
          'fixed top-13 bottom-0 z-999 transition-all duration-300',
          {
            'left-0': sidebarIsOpen,
            'left-[-260px]': !sidebarIsOpen,
          },
          className
        )}
        {...props}
      >
        {!hideSearch && (
          <div className="mb-[.625rem]">
            <InputSearch
              className="w-full"
              classNameInput="global-paragraph text-black-100 dark:text-greyish-semi-white focus:bg-white! dark:focus:bg-black-60! border-none outline-none! "
              placeholder="Cari menu"
              suffix={<SearchIcon />}
              value={search}
              onChangeValue={setSearch}
            />
          </div>
        )}

        {/* List Module, Section Menu, dan Menu Item */}
        {filteredMenu?.length ? (
          filteredMenu?.map((module, index) => <SidebarSection key={module?.module || 'module' + index} module={module?.module} menu={module.menu} />)
        ) : (
          <div className="w-full flex justify-center items-center min-h-40">
            <Typography as="global-report-content" className="mb-1 px-[.625rem]">
              Menu <b>{search}</b> tidak ditemukan
            </Typography>
          </div>
        )}
      </div>
    </SidebarProvier>
  );
};

export default memo(Sidebar);
