import { useState, useEffect, ReactNode } from 'react';

const DelayedRender = ({ children, delay = 100 }: { children: ReactNode; delay?: number }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return <>{children}</>;
};

export default DelayedRender;
