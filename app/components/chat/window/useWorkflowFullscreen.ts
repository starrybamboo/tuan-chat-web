import type { ReactFlowInstance } from "@xyflow/react";
import type { RefObject } from "react";

import { useCallback, useEffect, useState } from "react";

type UseWorkflowFullscreenResult = {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
};

export function useWorkflowFullscreen(
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>,
): UseWorkflowFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen)
      return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        setIsFullscreen(false);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!reactFlowInstanceRef.current)
      return;
    requestAnimationFrame(() => {
      reactFlowInstanceRef.current?.fitView({ padding: isFullscreen ? 0.12 : 0.18, duration: 260 });
    });
  }, [isFullscreen, reactFlowInstanceRef]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}
