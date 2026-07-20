import clsx from 'clsx';
import React from 'react';

export interface IInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: React.HTMLInputTypeAttribute;
}

export const Input = React.forwardRef<HTMLInputElement, IInputProps>(({ className, disabled, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      className={clsx(
        'h-10 rounded-[4px] text-base py-[.625rem] px-[.5rem] placeholder-black-40 dark:placeholder:text-black-40',
        'flex w-full text-black-100 dark:text-greyish-semi-white border border-black-40 dark:border-black-60 global-paragraph',
        'outline-none focus:border-navy-100 dark:focus:border-navy-80 focus:text-black-60 dark:focus:text-greyish-semi-white focus:border-2',
        'read-only:bg-greyish-semi-dark-50 dark:read-only:bg-black-60',
        className,
        {
          'pointer-events-none bg-greyish-semi-dark-50 dark:bg-black-60': disabled,
        }
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
