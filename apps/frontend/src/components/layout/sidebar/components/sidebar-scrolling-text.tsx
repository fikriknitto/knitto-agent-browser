import { ReactNode, useRef } from 'react';

interface ScrollingTextProps {
  children: ReactNode;
  title?: string;
}

export const SidebarScrollingText: React.FC<ScrollingTextProps> = ({ children, title }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const outer = outerRef.current;
    const inner = innerRef.current;

    if (!outer || !inner) return;

    const scrollDistance = inner.scrollWidth - outer.clientWidth;

    if (scrollDistance > 0) {
      inner.style.transition = 'transform 0.5s linear';
      inner.style.transform = `translateX(-${scrollDistance}px)`;
    }
  };

  const handleMouseLeave = () => {
    const inner = innerRef.current;
    if (inner) {
      inner.style.transition = 'transform 0.5s ease';
      inner.style.transform = 'translateX(0)';
    }
  };

  return (
    <div
      ref={outerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex-1 min-w-0 truncate global-report-content !text-inherit"
      title={title}
    >
      <div ref={innerRef} className="inline-block">
        {children}
      </div>
    </div>
  );
};
