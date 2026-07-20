import clsx from 'clsx';
import * as React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={clsx(
        'flex min-h-[5rem] w-full rounded-md border border-black-40 dark:border-black-60 p-2 resize-none',
        'text-black-100 dark:text-greyish-semi-white bg-white dark:bg-black-80',
        'placeholder:text-black-40 dark:placeholder:text-black-40 focus-visible:outline-none disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
