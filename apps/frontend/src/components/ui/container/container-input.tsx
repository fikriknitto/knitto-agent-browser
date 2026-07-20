import clsx from 'clsx';

export default function ContainerInput({
  children,
  className,
  direction = 'column',
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  direction?: 'row' | 'column';
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx('flex ', className, {
        'flex-col': direction === 'column',
        'flex-row gap-x-2 items-center': direction === 'row',
      })}
    >
      {children}
    </div>
  );
}
