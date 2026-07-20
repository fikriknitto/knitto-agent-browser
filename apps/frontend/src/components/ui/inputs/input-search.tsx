import clsx from 'clsx';
import SearchIcon from '../icon/search';
import { IInputDebounceProps } from './types';
import InputDebounce from './input-debounce';

export default function InputSearch({ onChangeValue, classNameInput, noIcon, ...props }: IInputDebounceProps) {
  return (
    <InputDebounce
      onChangeValue={onChangeValue}
      suffix={!noIcon && <SearchIcon className="w-[.9375rem]" />}
      classNamePosition="top-4 right-[.5313rem]"
      classNameInput={clsx('pl-2! h-8! pr-10', classNameInput)}
      {...props}
    />
  );
}
