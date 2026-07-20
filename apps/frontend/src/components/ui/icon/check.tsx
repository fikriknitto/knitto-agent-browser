interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export default function CheckIcon({ className, color, ...props }: SVGProps) {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.62 0.715366C14.0533 1.05776 14.127 1.68662 13.7846 2.11996L6.67352 11.12C6.49823 11.3418 6.23722 11.4791 5.95509 11.4978C5.67297 11.5165 5.3961 11.4149 5.19304 11.2182L0.30415 6.48135C-0.0924933 6.09704 -0.102493 5.46395 0.281814 5.06731C0.666122 4.67066 1.29921 4.66067 1.69585 5.04497L5.63124 8.85797C5.71629 8.94038 5.85392 8.93125 5.92734 8.83833L12.2154 0.880042C12.5578 0.446701 13.1866 0.372972 13.62 0.715366Z"
        fill={color || 'white'}
      />
    </svg>
  );
}
