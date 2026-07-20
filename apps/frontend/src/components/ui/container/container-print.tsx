import { forwardRef } from 'react';
import Portal from '../portal';

const ContainerPrint = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => {
  return (
    <Portal>
      <div className="hidden">
        <div ref={ref}>{children}</div>
      </div>
    </Portal>
  );
});

ContainerPrint.displayName = 'ContainerPrint';
export default ContainerPrint;
