import { useEffect, useState } from "react";

export function useDelayedPresence(isOpen: boolean, delayMs: number) {
  const [isPresent, setIsPresent] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setIsPresent(true));
      return;
    }

    const timer = window.setTimeout(() => {
      setIsPresent(false);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isOpen]);

  return isPresent;
}
