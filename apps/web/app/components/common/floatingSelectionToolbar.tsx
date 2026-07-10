import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 原生选区快照。
 * 用于在浮动工具栏点击后恢复编辑区内的选中文本。
 */
export type SavedNativeSelection = {
  range: Range;
  text: string;
  editor: HTMLElement;
}

/**
 * 浮动工具栏在视口中的定位坐标。
 */
export type FloatingSelectionToolbarPosition = {
  x: number;
  y: number;
  placement?: "bottom" | "top";
}

type UseFloatingSelectionToolbarOptions = {
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

type FloatingSelectionToolbarState = {
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
  const pointerSelectingRef = useRef(false);

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
    }
  }, [hideToolbar, suspend]);

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

    const rect = getSelectionAnchorRect(range);
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      hideToolbar();
      return;
    }

    savedSelectionRef.current = {
      range: range.cloneRange(),
      text,
      editor,
    };
    setToolbarPos(createToolbarPosition(rect));
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
    }, 80);
  }, [updateFloatingFromSelection]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }

    const handleMouseUp = () => {
      pointerSelectingRef.current = false;
      scheduleUpdateFloatingFromSelection();
    };

    const handleSelectionChange = () => {
      if (pointerSelectingRef.current) {
        return;
      }
      scheduleUpdateFloatingFromSelection();
    };

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) {
        return;
      }
      pointerSelectingRef.current = true;
      hideToolbar();
    };

    const handleTouchEnd = () => {
      pointerSelectingRef.current = false;
      scheduleUpdateFloatingFromSelection();
    };

    const handleKeyUp = () => {
      scheduleUpdateFloatingFromSelection();
    };

    const handleScroll = () => {
      if (isFloatingVisible) {
        updateFloatingFromSelection();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("keyup", handleKeyUp);
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
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("keyup", handleKeyUp);
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

function getSelectionAnchorRect(range: Range) {
  const rects = Array.from(range.getClientRects())
    .filter(rect => rect.width > 0 || rect.height > 0);
  if (rects.length === 0) {
    return range.getBoundingClientRect();
  }

  const left = Math.min(...rects.map(rect => rect.left));
  const right = Math.max(...rects.map(rect => rect.right));
  const top = Math.min(...rects.map(rect => rect.top));
  const bottom = Math.max(...rects.map(rect => rect.bottom));

  return {
    bottom,
    height: bottom - top,
    left,
    right,
    top,
    width: right - left,
    x: left,
    y: top,
  } as DOMRect;
}

function createToolbarPosition(rect: DOMRect): FloatingSelectionToolbarPosition {
  const viewportPadding = 12;
  const x = Math.min(
    Math.max(rect.left + rect.width / 2, viewportPadding),
    window.innerWidth - viewportPadding,
  );
  const hasRoomAbove = rect.top > 52;

  return {
    x,
    y: hasRoomAbove ? rect.top : rect.bottom,
    placement: hasRoomAbove ? "top" : "bottom",
  };
}

type FloatingSelectionToolbarProps = {
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
    <>
      <style>
        {`
          @keyframes tuanchat-selection-toolbar-pop {
            from {
              opacity: 0;
              transform: translateY(var(--selection-toolbar-enter-y, 4px)) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .tuanchat-selection-toolbar-pop {
            animation: tuanchat-selection-toolbar-pop 140ms cubic-bezier(0.2, 0, 0, 1);
            transform-origin: var(--selection-toolbar-origin, center bottom);
          }

          @media (prefers-reduced-motion: reduce) {
            .tuanchat-selection-toolbar-pop {
              animation: none;
            }
          }
        `}
      </style>
      <div
        ref={toolbarRef}
        className={`
          fixed z-40 max-w-[calc(100vw-1rem)] overflow-visible
          ${className}
        `}
        style={{
          left: position.x,
          top: position.placement === "bottom" ? position.y + 8 : position.y - 8,
          transform: position.placement === "bottom" ? "translate(-50%, 0)" : "translate(-50%, -100%)",
        }}
      >
        <div
          className={`
            tuanchat-selection-toolbar-pop flex items-center gap-1 rounded-xl border border-base-content/10
            bg-base-100/95 px-1.5 py-1 text-xs shadow-[0_12px_36px_rgba(0,0,0,0.28)]
            ring-1 ring-white/5 backdrop-blur-xl
            ${shellClassName}
          `}
          style={{
            "--selection-toolbar-enter-y": position.placement === "bottom" ? "-4px" : "4px",
            "--selection-toolbar-origin": position.placement === "bottom" ? "center top" : "center bottom",
          } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
