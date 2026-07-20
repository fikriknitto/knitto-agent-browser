import { Typography } from '@knittotextile/react-ui';
import clsx from 'clsx';
import React from 'react';
import Input from './input';
import { IInputProps } from './types';

export interface InputProps extends IInputProps {
  classNameWrapper?: string;
  classNameInput?: string;
  label: string;
}

const InputwithLabel = React.forwardRef<HTMLInputElement, InputProps>(({ classNameWrapper, classNameInput, label, ...props }, ref) => {
  return (
    <div className={clsx('flex flex-col gap-y-0.5', classNameWrapper)} ref={ref}>
      <Typography as="global-report-title" className="inline-block text-black-100 dark:text-greyish-semi-white">
        {label}
      </Typography>
      <Input className={classNameInput} {...props} />
    </div>
  );
});
InputwithLabel.displayName = 'Input-WithLabel';

export default InputwithLabel;
