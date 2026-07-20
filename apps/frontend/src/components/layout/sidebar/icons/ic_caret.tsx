const rotateList = {
  top: 'rotate(180deg)',
  bottom: 'rotate(0deg)',
  right: 'rotate(-90deg)',
  left: 'rotate(90deg)',
};

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  rotate?: keyof typeof rotateList;
  className?: string;
  color?: string;
}

export default function IcCaret({ className, rotate = 'bottom', ...props }: SVGProps) {
  return (
    <svg
      style={{ transform: rotateList[rotate] }}
      width={13}
      height={8}
      viewBox="0 0 13 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M0.375 0.5L6.5 7.5L12.625 0.5H0.375Z" fill="currentColor" />
    </svg>
  );
}
