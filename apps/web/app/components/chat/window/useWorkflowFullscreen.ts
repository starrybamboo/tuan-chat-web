import type { ReactFlowInstance } from "@xyflow/react";
import type { RefObject } from "react";

import { useCallback, useEffect, useState } from "react";

type UseWorkflowFullscreenResult = {
  isFullscreen: boolean;
  closeFullscreen: () => void;
  toggleFullscreen: () => void;
};

export function useWorkflowFullscreen(
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>,
): UseWorkflowFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen)
      return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
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

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  return {
    isFullscreen,
    closeFullscreen,
    toggleFullscreen,
  };
}
