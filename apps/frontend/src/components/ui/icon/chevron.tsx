import clsx from 'clsx';

const rotateList = {
  right: 'rotate(180deg)',
  left: 'rotate(0deg)',
  top: 'rotate(90deg)',
  bottom: 'rotate(270deg)',
};

interface SVGProps extends React.SVGProps<SVGSVGElement> {
  rotate?: keyof typeof rotateList;
  className?: string;
  color?: string;
}

export default function ChevronIcon({ rotate = 'left', className, color, ...props }: SVGProps) {
  return (
    <svg
      style={{ transform: rotateList[rotate] }}
      className={clsx('w-[.4375rem] h-[.8125rem]', className)}
      width="13"
      height="13"
      viewBox="0 0 7 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.16017 0.962363C6.50731 1.25164 6.55421 1.76756 6.26493 2.11469L2.69781 6.39524C2.64724 6.45592 2.64724 6.54407 2.69781 6.60476L6.26493 10.8853C6.55421 11.2324 6.50731 11.7484 6.16017 12.0376C5.81304 12.3269 5.29712 12.28 5.00784 11.9329L0.916932 7.02379C0.664083 6.72037 0.664083 6.27963 0.916932 5.97621L5.00784 1.06712C5.29712 0.719985 5.81304 0.673083 6.16017 0.962363Z"
        fill={color || 'white'}
      />
    </svg>
  );
}
