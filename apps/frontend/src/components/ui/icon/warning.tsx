interface SVGProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export default function WarningIcon({ className, color, ...props }: SVGProps) {
  return (
    <svg width="4" height="16" viewBox="0 0 4 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.92279 10.5C3.0304 10.5 3.11872 10.4149 3.12266 10.3073L3.4924 0.207317C3.49655 0.0940668 3.40586 0 3.29254 0H0.70975C0.595558 0 0.504545 0.0954501 0.509977 0.209513L0.990929 10.3095C0.996007 10.4162 1.08394 10.5 1.1907 10.5H2.92279ZM0.5 14.5098C0.5 14.0719 0.638889 13.7124 0.916667 13.4314C1.20062 13.1438 1.56173 13 2 13C2.43827 13 2.7963 13.1438 3.07407 13.4314C3.35802 13.7124 3.5 14.0719 3.5 14.5098C3.5 14.9412 3.36111 15.2974 3.08333 15.5784C2.81173 15.8595 2.45062 16 2 16C1.54938 16 1.18519 15.8595 0.907408 15.5784C0.635803 15.2974 0.5 14.9412 0.5 14.5098Z"
        fill={color || 'white'}
      />
    </svg>
  );
}
