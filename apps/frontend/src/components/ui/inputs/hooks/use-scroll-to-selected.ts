import { useEffect, useState } from 'react';

export function useScrollToSelected({
  nodeRef,
  selectedValue,
  listValue,
}: {
  nodeRef: React.RefObject<HTMLUListElement>;
  selectedValue: number | string;
  listValue: Array<unknown>;
}) {
  const [increment, setIncrement] = useState(0);

  useEffect(() => {
    if (!selectedValue || !nodeRef.current) return;
    for (let i = 0; i < listValue.length; i++) {
      if (selectedValue === listValue[i]) {
        const li = nodeRef.current?.querySelectorAll('li')[i];
        nodeRef.current?.scrollTo({
          top: (li as HTMLElement).offsetTop - (nodeRef.current as HTMLElement).offsetTop - 150,
          behavior: increment ? 'smooth' : 'instant',
        });
        break;
      }
    }
  }, [increment, selectedValue, listValue, nodeRef]);

  const flushSyncUI = () => setIncrement((i) => i + 1);
  return { flushSyncUI };
}
