import { toggleSidebar } from '@/redux/layoutSlice';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import SidebarChildIndicator from './components/sidebar-child-indicator';
import SidebarLabelItem from './components/sidebar-label-item';
import SidebarLineVertical from './components/sidebar-line-vertical';
import { DEFAULT_PADDING_LEFT } from './constant';
import { useSidebarContext } from './service/sidebar-context';
import { ISidebarSectionItem } from './types';
import { hasActiveChild } from './utils';

export default function SidebarSectionItem(props: ISidebarSectionItem) {
  const { item, level, isLastMenu, paddingLeft = DEFAULT_PADDING_LEFT } = props;
  const { activeMenu, setActiveMenu } = useSidebarContext();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSubOpen, setIsSubOpen] = useState(false);

  const isActiveMenu = useMemo(() => {
    return hasActiveChild(item, pathname);
  }, [item, pathname]);

  useEffect(() => {
    setIsSubOpen(isActiveMenu);
  }, [isActiveMenu]);

  const handleClickMenu = () => {
    const isSameMenu = activeMenu === item.label;
    const hasUrl = Boolean(item.url);
    const hasChildren = Boolean(item.children);

    if (item.customUrl) {
      navigate(item.customUrl);
      return;
    }
    // Navigasi jika ada URL
    if (hasUrl) {
      navigate(item.url || '/');
      dispatch(toggleSidebar());
      document.body.classList.remove('modal-open');
    }

    // Tutup submenu jika klik menu baru yang punya children dan URL
    if (hasUrl && hasChildren && !isSameMenu) {
      setIsSubOpen(false);
    }

    // Set active menu jika beda menu dan ada URL
    if (!isSameMenu && hasUrl) {
      setActiveMenu?.(item.label);
    }

    // Toggle submenu jika ada children
    if (hasChildren) {
      setIsSubOpen((prev) => !prev);
    }
  };

  const isExactActive = item?.url
    ? item.url === "/"
      ? pathname === "/"
      : pathname === `/${item.url.replace(/^\//, "")}` ||
        pathname.endsWith(`/${item.url.replace(/^\//, "")}`)
    : false;

  return (
    <div>
      <div
        onClick={handleClickMenu}
        className={clsx(
          'group p-[.625rem] relative flex items-center justify-between cursor-pointer dark:text-greyish-semi-white',
          'hover:bg-navy-80 hover:text-white',
          {
            'pr-6!': item.children,
            'bg-navy-100 text-white dark:bg-navy-80': isExactActive,
            'bg-navy-20 dark:bg-black-60 dark:text-greyish-semi-white': !isExactActive && isActiveMenu,
          }
        )}
        style={{ paddingLeft }}
      >
        <SidebarLineVertical isLastMenu={isLastMenu} level={level} />
        <SidebarLabelItem icon={item.icon} label={item.label} />
        {item.children && <SidebarChildIndicator isSubOpen={isSubOpen} />}
      </div>

      {/* Sub menu item */}
      {item.children && (
        <div
          className={clsx('overflow-hidden transition-all duration-500 ease-in-out dark:bg-black-60/50', {
            'max-h-0 opacity-0': !isSubOpen,
            'max-h-[700px] opacity-100': isSubOpen,
          })}
        >
          {item.children.map((child, index) => (
            <SidebarSectionItem
              key={child?.url || 'sidebar-item' + index}
              item={child}
              level={level + 1}
              paddingLeft={paddingLeft + DEFAULT_PADDING_LEFT}
              isLastMenu={index === (item?.children?.length || 0) - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
