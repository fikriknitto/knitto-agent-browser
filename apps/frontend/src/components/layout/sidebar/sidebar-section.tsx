import { Typography } from '@knittotextile/react-ui';
import SidebarSectionItem from './sidebar-section-item';
import { ISidebarSection } from './types';

export default function SidebarSection({ module, menu }: ISidebarSection) {
  return (
    <div className="mt-[.625rem]">
      {module && (
        <Typography as="global-report-title" className="mb-1 px-[.625rem] dark:text-greyish-semi-white">
          {module}
        </Typography>
      )}

      <div>
        {menu.map((menuItem, index) => (
          <SidebarSectionItem key={menuItem.label + index} item={menuItem} level={1} />
        ))}
      </div>
    </div>
  );
}
