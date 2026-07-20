interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function DargOutlineIcon({ className, ...props }: SVGProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 16 16" className={className} {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}>
        <path d="M9.75 4.75h.005v.005H9.75z"></path>
        <path d="M10 4.75a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m-.25 3.245h.005V8H9.75z"></path>
        <path d="M10 7.995a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m-.25 3.255h.005v.005H9.75z"></path>
        <path d="M10 11.25a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m-3.75-6.5h.005v.005H6.25z"></path>
        <path d="M6.5 4.75a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m-.25 3.245h.005V8H6.25z"></path>
        <path d="M6.5 7.995a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m-.25 3.255h.005v.005H6.25z"></path>
        <path d="M6.5 11.25a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0"></path>
      </g>
    </svg>
  );
}
