import type { DocMode } from "@blocksuite/affine/model";
import type { RefObject } from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

function warnNonFatalBlocksuiteError(message: string, error: unknown) {
  console.warn(message, error);
}

function tryFocusEdgelessViewport(editor: any, store: any): boolean {
  try {
    const doc = store as any;
    const rootId = doc?.root?.id;
    const rootBlock = editor?.host?.view?.getBlock?.(rootId);

    rootBlock?.gfx?.fitToScreen?.();
    return true;
  }
  catch (error) {
    warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to focus edgeless viewport", error);
  }
  return false;
}

type UseBlocksuiteViewportBehaviorParams = {
  currentMode: DocMode;
  allowModeSwitch: boolean;
  fullscreenEdgeless: boolean;
  isFull: boolean;
  className?: string;
  tcHeaderEnabled: boolean;
  editorRef: RefObject<HTMLElement | null>;
  storeRef: RefObject<any>;
  fullscreenRootRef: RefObject<HTMLDivElement | null>;
  hostContainerRef: RefObject<HTMLDivElement | null>;
};

export function useBlocksuiteViewportBehavior(params: UseBlocksuiteViewportBehaviorParams) {
  const {
    currentMode,
    allowModeSwitch,
    fullscreenEdgeless,
    isFull,
    className,
    tcHeaderEnabled,
    editorRef,
    storeRef,
    fullscreenRootRef,
    hostContainerRef,
  } = params;

  const prevModeRef = useRef<DocMode>(currentMode);
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

  const hasHeightConstraintClass = useMemo(() => {
    const value = (className ?? "").trim();
    if (!value)
      return false;
    return /(?:^|\s)(?:h-\[|h-|max-h-)/.test(value);
  }, [className]);

  const viewportOverflowClass = currentMode === "page"
    ? ((isFull || isEdgelessFullscreen || isBrowserFullscreen || hasHeightConstraintClass) ? "overflow-auto" : "overflow-visible")
    : "overflow-hidden";

  useEffect(() => {
    const editor = editorRef.current as any;
    if (!editor)
      return;

    try {
      editor.switchEditor(currentMode);
      editor.style.height = (isEdgelessFullscreen || isBrowserFullscreen || isFull) ? "100%" : "auto";
    }
    catch (error) {
      warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to sync editor mode", error);
    }

    const prev = prevModeRef.current;
    prevModeRef.current = currentMode;

    let rafId: number | null = null;
    let t0: ReturnType<typeof setTimeout> | null = null;
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    if (prev !== "edgeless" && currentMode === "edgeless") {
      const run = () => {
        const nextEditor = editorRef.current as any;
        const store = storeRef.current;
        if (!nextEditor || !store)
          return;
        tryFocusEdgelessViewport(nextEditor, store);
      };

      rafId = requestAnimationFrame(() => {
        t0 = setTimeout(run, 0);
        t1 = setTimeout(run, 120);
        t2 = setTimeout(run, 300);
      });
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (t0) {
        clearTimeout(t0);
      }
      if (t1) {
        clearTimeout(t1);
      }
      if (t2) {
        clearTimeout(t2);
      }
    };
  }, [currentMode, editorRef, isBrowserFullscreen, isEdgelessFullscreen, isFull, storeRef]);

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
    return [
      tcHeaderEnabled ? "tc-blocksuite-tc-header-enabled" : "",
      className,
      (isFull || isEdgelessFullscreen || isBrowserFullscreen) ? "h-full min-h-0" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [className, isBrowserFullscreen, isEdgelessFullscreen, isFull, tcHeaderEnabled]);

  return {
    isEdgelessFullscreen,
    isBrowserFullscreen,
    rootClassName,
    viewportOverflowClass,
    toggleBrowserFullscreen,
  };
}
