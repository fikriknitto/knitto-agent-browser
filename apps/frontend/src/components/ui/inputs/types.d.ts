import { ReactNode } from 'react';

export interface IInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: React.HTMLInputTypeAttribute;
}

export interface IInputDebounceProps extends IInputProps {
  classNameInput?: string;
  onChangeValue: (value: string) => void;
  suffix?: React.ReactNode;
  noIcon?: boolean;
}

export interface IInputWithSufixProps extends IInputProps {
  suffix?: ReactNode;
  className?: string;
  classNameInput?: string;
  classNamePosition?: string;
  onClickSuffix?: () => void;
}
