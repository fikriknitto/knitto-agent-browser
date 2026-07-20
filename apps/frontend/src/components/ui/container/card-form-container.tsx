import clsx from 'clsx';
import React from 'react';
import { Card } from '../card';
import { Typography } from '@knittotextile/react-ui';

export default function CardFormContainer({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card
      className={clsx(
        'bg-white dark:bg-black-80 dark:border dark:border-black-60 shadow-md w-[22.25rem] px-4 pb-[1.125rem] pt-[.625rem] flex flex-col gap-y-[.625rem]',
        'max-h-[calc(100vh-4.75rem)] overflow-auto border-none!',
        className
      )}
    >
      <Typography as="global-strong">{title}</Typography>
      {children}
    </Card>
  );
}
