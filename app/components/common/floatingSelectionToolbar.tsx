import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 原生选区快照。
 * 用于在浮动工具栏点击后恢复编辑区内的选中文本。
 */
export interface SavedNativeSelection {
  range: Range;
  text: string;
  editor: HTMLElement;
}

/**
 * 浮动工具栏在视口中的定位坐标。
 */
export interface FloatingSelectionToolbarPosition {
  x: number;
  y: number;
}

interface UseFloatingSelectionToolbarOptions {
  /**
   * 是否允许显示浮动工具栏。
   */
  visible?: boolean;
  /**
   * 暂时挂起工具栏显示，但保留选区监听。
   */
  suspend?: boolean;
  /**
   * 基于当前原生选区解析其所属编辑器；若返回 null，表示该选区不应触发工具栏。
   */
  resolveEditorElement: (range: Range) => HTMLElement | null;
}

interface FloatingSelectionToolbarState {
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  isFloatingVisible: boolean;
  toolbarPos: FloatingSelectionToolbarPosition | null;
  savedSelectionRef: React.RefObject<SavedNativeSelection | null>;
  saveSelection: () => SavedNativeSelection | null;
  hideToolbar: () => void;
}

/**
 * 管理“选中文本后显示”的浮动工具栏状态。
 */
export function useFloatingSelectionToolbar({
  suspend = false,
  visible = true,
  resolveEditorElement,
}: UseFloatingSelectionToolbarOptions): FloatingSelectionToolbarState {
  const savedSelectionRef = useRef<SavedNativeSelection | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [isFloatingVisible, setIsFloatingVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<FloatingSelectionToolbarPosition | null>(null);
  const scheduledUpdateIdRef = useRef<number | null>(null);

  const hideToolbar = useCallback(() => {
    setIsFloatingVisible(false);
    setToolbarPos(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      queueMicrotask(hideToolbar);
      savedSelectionRef.current = null;
    }
  }, [hideToolbar, visible]);

  useEffect(() => {
    if (suspend) {
      queueMicrotask(hideToolbar);
      return;
    }
    if (!visible) {
      return;
    }
    queueMicrotask(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const editor = resolveEditorElement(range);
      const text = selection.toString();
      if (!editor || !text.trim() || range.collapsed) {
        return;
      }

      const rects = range.getClientRects();
      const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        return;
      }

      savedSelectionRef.current = {
        range: range.cloneRange(),
        text,
        editor,
      };
      setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top });
      setIsFloatingVisible(true);
    });
  }, [hideToolbar, resolveEditorElement, suspend, visible]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const editor = resolveEditorElement(range);
    if (!editor) {
      return null;
    }

    return {
      range: range.cloneRange(),
      text: selection.toString(),
      editor,
    };
  }, [resolveEditorElement]);

  const updateFloatingFromSelection = useCallback(() => {
    if (suspend) {
      hideToolbar();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const editor = resolveEditorElement(range);
    const text = selection.toString();
    if (!editor || !text.trim() || range.collapsed) {
      hideToolbar();
      return;
    }

    const rects = range.getClientRects();
    const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hideToolbar();
      return;
    }

    savedSelectionRef.current = {
      range: range.cloneRange(),
      text,
      editor,
    };
    setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top });
    setIsFloatingVisible(true);
  }, [hideToolbar, resolveEditorElement, suspend]);

  const scheduleUpdateFloatingFromSelection = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (scheduledUpdateIdRef.current !== null) {
      window.clearTimeout(scheduledUpdateIdRef.current);
      scheduledUpdateIdRef.current = null;
    }

    scheduledUpdateIdRef.current = window.setTimeout(() => {
      scheduledUpdateIdRef.current = null;
      updateFloatingFromSelection();
    }, 0);
  }, [updateFloatingFromSelection]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }

    const handleMouseUp = () => {
      scheduleUpdateFloatingFromSelection();
    };

    const handleSelectionChange = () => {
      scheduleUpdateFloatingFromSelection();
    };

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }
      hideToolbar();
    };

    const handleScroll = () => {
      if (isFloatingVisible) {
        updateFloatingFromSelection();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleDocumentMouseDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      if (scheduledUpdateIdRef.current !== null) {
        window.clearTimeout(scheduledUpdateIdRef.current);
        scheduledUpdateIdRef.current = null;
      }
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [hideToolbar, isFloatingVisible, scheduleUpdateFloatingFromSelection, updateFloatingFromSelection, visible]);

  return {
    toolbarRef,
    isFloatingVisible,
    toolbarPos,
    savedSelectionRef,
    saveSelection,
    hideToolbar,
  };
}

interface FloatingSelectionToolbarProps {
  /**
   * 工具栏是否可见。
   */
  visible: boolean;
  /**
   * 工具栏定位坐标。
   */
  position: FloatingSelectionToolbarPosition | null;
  /**
   * 用于外部判断点击是否发生在工具栏内的 ref。
   */
  toolbarRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  shellClassName?: string;
  children: React.ReactNode;
}

/**
 * 统一的选区浮动工具栏外壳。
 */
export function FloatingSelectionToolbar({
  visible,
  position,
  toolbarRef,
  className = "",
  shellClassName = "",
  children,
}: FloatingSelectionToolbarProps) {
  if (!visible || !position || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={toolbarRef}
      className={`fixed z-40 ${className}`}
      style={{
        left: position.x,
        top: position.y - 8,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className={`flex items-center gap-0.5 rounded-full border border-base-300 bg-base-100/95 px-1.5 py-1 text-xs shadow-lg backdrop-blur ${shellClassName}`}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
