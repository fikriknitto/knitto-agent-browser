import clsx from 'clsx';
import { DEFAULT_PADDING_LEFT } from '../constant';

interface Props {
  isLastMenu?: boolean;
  level: number;
}

export default function SidebarLineVertical({ isLastMenu, level }: Props) {
  if (level < 1) return null;

  return Array(level - 1)
    .fill(null)
    .map((_, idx) => (
      <div
        key={idx}
        className={clsx('absolute top-0 w-px bg-gray-400 dark:bg-black-40', isLastMenu && idx === level - 2 ? 'h-1/2' : 'h-full')}
        style={{ left: (idx + 1) * DEFAULT_PADDING_LEFT }}
      >
        {idx + 1 === level - 1 && (
          <div
            className={clsx('absolute w-[0.4rem] h-px rounded-sm bg-gray-400 dark:bg-black-40', isLastMenu ? 'bottom-0' : 'top-1/2 -translate-y-1/2')}
          />
        )}
      </div>
    ));
}
