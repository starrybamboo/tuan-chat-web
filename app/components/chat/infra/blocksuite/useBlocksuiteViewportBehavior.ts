import type { DocMode } from "@blocksuite/affine/model";
import type { RefObject } from "react";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function warnNonFatalBlocksuiteError(message: string, error: unknown) {
  console.warn(message, error);
}

type UseBlocksuiteViewportBehaviorParams = {
  currentMode: DocMode;
  allowModeSwitch: boolean;
  fullscreenEdgeless: boolean;
  isFull: boolean;
  className?: string;
  tcHeaderEnabled: boolean;
  fullscreenRootRef: RefObject<HTMLDivElement | null>;
  hostContainerRef: RefObject<HTMLDivElement | null>;
};

export function hasBlocksuiteHeightConstraintClass(className?: string): boolean {
  const value = (className ?? "").trim();
  if (!value)
    return false;
  return /(?:^|\s)(?:h-\[|h-|max-h-)/.test(value);
}

export function getBlocksuiteViewportOverflowClass(params: {
  currentMode: DocMode;
  isFull: boolean;
  isEdgelessFullscreen: boolean;
  isBrowserFullscreen: boolean;
  className?: string;
}): string {
  const { currentMode, isFull, isEdgelessFullscreen, isBrowserFullscreen, className } = params;
  if (currentMode !== "page")
    return "overflow-hidden";

  return (isFull || isEdgelessFullscreen || isBrowserFullscreen || hasBlocksuiteHeightConstraintClass(className))
    ? "overflow-auto"
    : "overflow-visible";
}

export function getBlocksuiteRootClassName(params: {
  tcHeaderEnabled: boolean;
  className?: string;
  isFull: boolean;
  isEdgelessFullscreen: boolean;
  isBrowserFullscreen: boolean;
}): string {
  const { tcHeaderEnabled, className, isFull, isEdgelessFullscreen, isBrowserFullscreen } = params;
  return [
    tcHeaderEnabled ? "tc-blocksuite-tc-header-enabled" : "",
    className,
    (isFull || isEdgelessFullscreen || isBrowserFullscreen) ? "h-full min-h-0" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function useBlocksuiteViewportBehavior(params: UseBlocksuiteViewportBehaviorParams) {
  const {
    currentMode,
    allowModeSwitch,
    fullscreenEdgeless,
    isFull,
    className,
    tcHeaderEnabled,
    fullscreenRootRef,
    hostContainerRef,
  } = params;
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const isEdgelessFullscreen = allowModeSwitch && fullscreenEdgeless && currentMode === "edgeless";

  useEffect(() => {
    if (typeof document === "undefined")
      return;

    const onChange = () => {
      const docAny = document as any;
      setIsBrowserFullscreen(Boolean(docAny.fullscreenElement ?? docAny.webkitFullscreenElement ?? docAny.msFullscreenElement));
    };

    onChange();
    document.addEventListener("fullscreenchange", onChange);
    const onWebkitChange = onChange as any;
    document.addEventListener("webkitfullscreenchange" as any, onWebkitChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange" as any, onWebkitChange);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !isBrowserFullscreen || currentMode === "edgeless")
      return;
    try {
      const docAny = document as any;
      const exit = docAny.exitFullscreen ?? docAny.webkitExitFullscreen ?? docAny.msExitFullscreen;
      void exit?.call(document);
    }
    catch (error) {
      warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to exit browser fullscreen", error);
    }
  }, [currentMode, isBrowserFullscreen]);

  const toggleBrowserFullscreen = useCallback(async () => {
    try {
      const root = fullscreenRootRef.current;
      if (!root)
        return;

      const docAny = document as any;
      const enabled = docAny.fullscreenEnabled ?? docAny.webkitFullscreenEnabled ?? docAny.msFullscreenEnabled;
      const request = (root as any).requestFullscreen ?? (root as any).webkitRequestFullscreen ?? (root as any).msRequestFullscreen;
      const exit = docAny.exitFullscreen ?? docAny.webkitExitFullscreen ?? docAny.msExitFullscreen;
      const fsElement = docAny.fullscreenElement ?? docAny.webkitFullscreenElement ?? docAny.msFullscreenElement;

      if (enabled === false || typeof request !== "function") {
        toast.error("当前环境不支持全屏");
        return;
      }

      if (fsElement) {
        await exit?.call(document);
      }
      else {
        await request.call(root);
      }
    }
    catch {
      toast.error("全屏切换失败");
    }
  }, [fullscreenRootRef]);

  const viewportOverflowClass = useMemo(() => {
    return getBlocksuiteViewportOverflowClass({
      currentMode,
      isFull,
      isEdgelessFullscreen,
      isBrowserFullscreen,
      className,
    });
  }, [className, currentMode, isBrowserFullscreen, isEdgelessFullscreen, isFull]);

  useEffect(() => {
    if (typeof document === "undefined" || !isEdgelessFullscreen)
      return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isEdgelessFullscreen]);

  useEffect(() => {
    const host = hostContainerRef.current;
    if (!host)
      return;

    if (currentMode !== "page" || !(isFull || isEdgelessFullscreen || isBrowserFullscreen)) {
      host.style.removeProperty("--tc-blocksuite-page-bottom-spacer");
      return;
    }

    const lineHeightPx = 24;
    const updateSpacer = () => {
      const visibleHeight = host.clientHeight;
      const spacer = Math.max(visibleHeight - lineHeightPx, 0);
      host.style.setProperty("--tc-blocksuite-page-bottom-spacer", `${spacer}px`);
    };

    updateSpacer();
    const resizeObserver = new ResizeObserver(() => {
      updateSpacer();
    });
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      host.style.removeProperty("--tc-blocksuite-page-bottom-spacer");
    };
  }, [currentMode, hostContainerRef, isBrowserFullscreen, isEdgelessFullscreen, isFull]);

  const rootClassName = useMemo(() => {
    return getBlocksuiteRootClassName({
      tcHeaderEnabled,
      className,
      isFull,
      isEdgelessFullscreen,
      isBrowserFullscreen,
    });
  }, [className, isBrowserFullscreen, isEdgelessFullscreen, isFull, tcHeaderEnabled]);

  return {
    isEdgelessFullscreen,
    isBrowserFullscreen,
    rootClassName,
    viewportOverflowClass,
    toggleBrowserFullscreen,
  };
}
