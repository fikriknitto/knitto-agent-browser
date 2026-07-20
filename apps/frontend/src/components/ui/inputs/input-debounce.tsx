import { debounce } from '@/lib/utils/utils';
import clsx from 'clsx';
import { ChangeEvent, useEffect, useState } from 'react';
import InputWithSuffix from './input-with-suffix';
import { IInputProps, IInputWithSufixProps } from './types';

export default function InputDebounce({
  onChangeValue,
  value,
  className,
  suffix,
  ...props
}: {
  classNameInput?: string;
  onChangeValue: (value: string) => void;
  suffix?: React.ReactNode;
} & IInputProps &
  IInputWithSufixProps) {
  const [currentValue, setCurrentValue] = useState<string>(value?.toString() || '');

  const [callback] = useState(() => debounce(onChangeValue));

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
    callback(e.target.value);
  };

  useEffect(() => {
    setCurrentValue(value?.toString() || '');
  }, [value]);

  return <InputWithSuffix value={currentValue} onChange={onChange} className={clsx(className)} suffix={suffix} {...props} />;
}
