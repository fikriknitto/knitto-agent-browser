import clsx from 'clsx';
import { Card } from '../card';
import { Typography } from '@knittotextile/react-ui';

export default function CardDataTableContainer({
  title,
  children,
  className,
}: {
  title?: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={clsx(
        ['bg-white dark:bg-black-80 dark:border dark:border-black-60 border-none! min-h-[calc(100vh-3.25rem)] shadow-md py-[.625rem]', 'shadow-lg'],
        className
      )}
    >
      {title && (
        <Typography as="global-strong" className="py-[.4063rem] px-4">
          {title}
        </Typography>
      )}
      {children}
    </Card>
  );
}
