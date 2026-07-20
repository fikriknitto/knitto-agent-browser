import clsx from 'clsx';

export default function Checkbox({
  checked,
  onChecked,
  className,
  ...props
}: { onChecked?: (checked: boolean) => void } & React.ComponentPropsWithoutRef<'input'>) {
  return (
    <div className="w-4 h-4 relative">
      <input
        type="checkbox"
        className={clsx('w-4 h-4 cursor-pointer absolute opacity-0  z-[100]', className)}
        checked={checked}
        onChange={(e) => onChecked && onChecked(e.target.checked)}
        {...props}
      />
      <div
        className={clsx('w-4 h-4 flex justify-center items-center border border-black-40 dark:border-black-60 absolute', {
          'bg-knitto-blue-100': checked,
          'bg-white dark:bg-black-80': !checked,
        })}
      >
        {checked && <CheckedIcon />}
      </div>
    </div>
  );
}

function CheckedIcon() {
  return (
    <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 4L4.57407 7L10.5 1" stroke="white" strokeWidth="2" />
    </svg>
  );
}
