import { env } from '@/lib/variables/env';
import clsx from 'clsx';
import React from 'react';

type Props = { data?: string; text: string; classNameWrapper?: string; classNameText?: string };

const KNUI: React.FC<Props> = ({ text, data, classNameWrapper, classNameText }) => {
  return (
    <div
      className={clsx([
        'absolute bottom-0 left-0 right-0 flex justify-end pr-1 items-center bg-[#F0F0F0] dark:bg-black-80 dark:border-t dark:border-black-60 h-6',
        classNameWrapper,
      ])}
    >
      <a
        href={`${env.VITE_DOCUMENTATION_URL}/${data || text}`}
        className={clsx('underline text-base text-navy-100 dark:text-navy-40 font-bold', classNameText)}
      >
        {text || data}
      </a>
    </div>
  );
};

export default KNUI;
