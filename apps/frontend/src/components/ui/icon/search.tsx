import clsx from 'clsx';

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export default function SearchIcon({ color, className, ...props }: SVGProps) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('text-black-60 dark:text-greyish-semi-white', className)}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.16127 7.56445C2.16127 4.58036 4.58036 2.16127 7.56445 2.16127C10.5485 2.16127 12.9676 4.58036 12.9676 7.56445C12.9676 10.5485 10.5485 12.9676 7.56445 12.9676C4.58036 12.9676 2.16127 10.5485 2.16127 7.56445ZM7.56445 0C3.38672 0 0 3.38672 0 7.56445C0 11.7422 3.38672 15.1289 7.56445 15.1289C8.95306 15.1289 10.2543 14.7547 11.3728 14.1017C11.8023 13.851 12.3558 13.8841 12.7075 14.2358L16.1552 17.6835C16.5773 18.1055 17.2615 18.1055 17.6835 17.6835C18.1055 17.2615 18.1055 16.5773 17.6835 16.1552L14.2358 12.7075C13.8841 12.3558 13.851 11.8023 14.1017 11.3728C14.7547 10.2543 15.1289 8.95306 15.1289 7.56445C15.1289 3.38672 11.7422 0 7.56445 0Z"
        style={{ fill: color ?? 'currentColor' }}
      />
    </svg>
  );
}
