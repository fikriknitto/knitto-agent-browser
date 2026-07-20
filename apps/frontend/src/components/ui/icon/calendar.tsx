import clsx from 'clsx';

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export default function CalendarIcon({ className, color, ...props }: SVGProps) {
  return (
    <svg
      className={clsx('w-[1.3125rem] h-[1.375rem]', className)}
      width="21"
      height="22"
      viewBox="0 0 21 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_109_299)">
        <path
          d="M18.1364 19.5909H2.86363V18.6364H1.90909V3.36364H2.86363V2.40909H4.77272V0.5H6.68182V2.40909H14.3182V0.5H16.2273V2.40909H18.1364V3.36364H19.0909V18.6364H18.1364V19.5909ZM3.81818 4.31818V6.22727H17.1818V4.31818H3.81818ZM3.81818 8.13636V17.6818H17.1818V8.13636H3.81818ZM11.4545 11.9545H15.2727V15.7727H11.4545V11.9545Z"
          fill={color || '#4A4C51'}
        />
      </g>
      <defs>
        <clipPath id="clip0_109_299">
          <rect width="21" height="21" fill={color || 'white'} transform="translate(0 0.5)" />
        </clipPath>
      </defs>
    </svg>
  );
}
