import type { DocMode } from "@blocksuite/affine/model";

import { useEffect, useRef } from "react";

import type { BlocksuiteEditorHandle } from "./blocksuiteRuntimeTypes";

function warnNonFatalBlocksuiteError(message: string, error: unknown) {
  console.warn(message, error);
}

export function shouldRefocusBlocksuiteEdgelessViewport(prevMode: DocMode, nextMode: DocMode): boolean {
  return prevMode !== "edgeless" && nextMode === "edgeless";
}

export function syncBlocksuiteEditorMode(params: {
  editor: any;
  currentMode: DocMode;
  shouldFillHeight: boolean;
}): boolean {
  const { editor, currentMode, shouldFillHeight } = params;
  if (!editor)
    return false;

  editor.switchEditor(currentMode);
  editor.style.height = shouldFillHeight ? "100%" : "auto";
  return true;
}

export function fitBlocksuiteEdgelessViewport(editor: any, store: any): boolean {
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

export function useBlocksuiteEditorModeSync(params: {
  currentMode: DocMode;
  shouldFillHeight: boolean;
  editorHandle: BlocksuiteEditorHandle;
}) {
  const { currentMode, shouldFillHeight, editorHandle } = params;
  const prevModeRef = useRef<DocMode>(currentMode);

  useEffect(() => {
    const editor = editorHandle.editorRef.current as any;
    if (!editor)
      return;

    try {
      syncBlocksuiteEditorMode({
        editor,
        currentMode,
        shouldFillHeight,
      });
    }
    catch (error) {
      warnNonFatalBlocksuiteError("[BlocksuiteDescriptionEditor] Failed to sync editor mode", error);
    }

    const prevMode = prevModeRef.current;
    prevModeRef.current = currentMode;

    let rafId: number | null = null;
    let t0: ReturnType<typeof setTimeout> | null = null;
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    if (shouldRefocusBlocksuiteEdgelessViewport(prevMode, currentMode)) {
      const run = () => {
        fitBlocksuiteEdgelessViewport(editorHandle.editorRef.current, editorHandle.storeRef.current);
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
  }, [currentMode, editorHandle, shouldFillHeight]);
}
