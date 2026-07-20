interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
  width?: string;
  height?: string;
}

export default function CloseIcon({ className, width, height, color, ...props }: SVGProps) {
  return (
    <svg
      width={width ? width : '12'}
      height={height ? height : '12'}
      viewBox="0 0 12 12"
      fill={color ?? 'currentColor'}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.768485 0.768485C1.12647 0.410505 1.70687 0.410505 2.06485 0.768485L5.85858 4.56222C5.93668 4.64032 6.06332 4.64032 6.14142 4.56222L9.93515 0.768485C10.2931 0.410505 10.8735 0.410505 11.2315 0.768485C11.5895 1.12647 11.5895 1.70687 11.2315 2.06485L7.43778 5.85858C7.35968 5.93668 7.35968 6.06332 7.43778 6.14142L11.2315 9.93515C11.5895 10.2931 11.5895 10.8735 11.2315 11.2315C10.8735 11.5895 10.2931 11.5895 9.93515 11.2315L6.14142 7.43778C6.06332 7.35968 5.93668 7.35968 5.85858 7.43778L2.06485 11.2315C1.70687 11.5895 1.12647 11.5895 0.768485 11.2315C0.410505 10.8735 0.410505 10.2931 0.768485 9.93515L4.56222 6.14142C4.64032 6.06332 4.64032 5.93668 4.56222 5.85858L0.768485 2.06485C0.410505 1.70687 0.410505 1.12647 0.768485 0.768485Z"
        fill={color ?? 'currentColor'}
      />
    </svg>
  );
}
