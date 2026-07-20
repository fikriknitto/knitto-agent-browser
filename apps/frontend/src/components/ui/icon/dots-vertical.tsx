import clsx from 'clsx';

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export default function DotsVertical({ className, color }: SVGProps) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('w-[1.125rem] h-[1.125rem]', className)}
    >
      <path
        d="M7.875 4.125C7.875 3.50368 8.37868 3 9 3C9.62132 3 10.125 3.50368 10.125 4.125C10.125 4.74632 9.62132 5.25 9 5.25C8.37868 5.25 7.875 4.74632 7.875 4.125Z"
        fill={color || 'white'}
      />
      <path
        d="M7.875 9C7.875 8.37868 8.37868 7.875 9 7.875C9.62132 7.875 10.125 8.37868 10.125 9C10.125 9.62132 9.62132 10.125 9 10.125C8.37868 10.125 7.875 9.62132 7.875 9Z"
        fill={color || 'white'}
      />
      <path
        d="M7.875 13.875C7.875 13.2537 8.37868 12.75 9 12.75C9.62132 12.75 10.125 13.2537 10.125 13.875C10.125 14.4963 9.62132 15 9 15C8.37868 15 7.875 14.4963 7.875 13.875Z"
        fill={color || 'white'}
      />
    </svg>
  );
}
