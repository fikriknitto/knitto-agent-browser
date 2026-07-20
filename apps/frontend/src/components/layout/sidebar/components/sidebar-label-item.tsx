import { SidebarScrollingText } from './sidebar-scrolling-text';

interface Props {
  icon?: React.ReactNode;
  label: string;
}

export default function SidebarLabelItem({ icon, label }: Props) {
  return (
    <div className="w-full flex items-center text-inherit">
      {icon && <div className="me-1 shrink-0">{icon}</div>}
      <SidebarScrollingText title={label}>{label}</SidebarScrollingText>
    </div>
  );
}
