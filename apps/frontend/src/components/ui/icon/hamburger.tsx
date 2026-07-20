interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export default function HamburgerIcon({ className, color, ...props }: SVGProps) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect width="16" height="2" rx="1" fill={color || 'white'} />
      <rect y="6" width="16" height="2" rx="1" fill={color || 'white'} />
      <rect y="12" width="16" height="2" rx="1" fill={color || 'white'} />
    </svg>
  );
}
