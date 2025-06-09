import React, { useEffect } from "react";

/**
 *暂时没用到
 */
export function useIntersectionObserver(ref: React.RefObject<HTMLDivElement | null>, options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref?.current) {
      observer.observe(ref.current);
    }
    const refCurrent = ref?.current;
    return () => {
      refCurrent && observer.unobserve(refCurrent);
    };
  }, [ref, options]);

  return isIntersecting;
}
