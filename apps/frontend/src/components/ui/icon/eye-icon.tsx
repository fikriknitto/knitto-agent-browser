import clsx from 'clsx';

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export default function EyeIcon({ className, color, ...props }: SVGProps) {
  return (
    <div className="relative eye-icon text-black-100 dark:text-greyish-semi-white">
      <div className="eye-icon__stroke hidden absolute rotate-45 border-b-2 top-1/2 border-b-gray-700 dark:border-b-greyish-semi-white left-0 right-0"></div>
      <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg" className={clsx(className)} {...props}>
        <path
          d="M13.125 13.1875C13.125 14.6372 11.9497 15.8125 10.5 15.8125C9.05025 15.8125 7.875 14.6372 7.875 13.1875C7.875 11.7378 9.05025 10.5625 10.5 10.5625C11.9497 10.5625 13.125 11.7378 13.125 13.1875Z"
          fill={color ?? 'currentColor'}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.93153 8.05653C6.40838 6.57968 8.41142 5.75 10.5 5.75C12.5886 5.75 14.5916 6.57969 16.0685 8.05653C17.5453 9.53338 18.375 11.5364 18.375 13.625H16.625C16.625 12.0005 15.9797 10.4426 14.831 9.29397C13.6824 8.14531 12.1245 7.5 10.5 7.5C8.87555 7.5 7.31763 8.14531 6.16897 9.29397C5.02031 10.4426 4.375 12.0005 4.375 13.625L2.625 13.625C2.625 11.5364 3.45469 9.53338 4.93153 8.05653Z"
          fill={color ?? 'currentColor'}
        />
      </svg>
    </div>
  );
}
