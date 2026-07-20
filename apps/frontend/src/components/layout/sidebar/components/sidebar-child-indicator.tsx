import IcCaret from '../icons/ic_caret';

export default function SidebarChildIndicator({ isSubOpen }: { isSubOpen: boolean }) {
  return (
    <IcCaret
      className="w-[.625rem]! absolute right-[.625rem] text-inherit transition-transform duration-300 ease-in-out"
      rotate={isSubOpen ? 'top' : 'bottom'}
    />
  );
}
