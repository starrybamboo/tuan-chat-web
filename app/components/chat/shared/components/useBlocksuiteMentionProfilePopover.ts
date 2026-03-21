import type { BlocksuiteMentionProfilePopoverState } from "@/components/chat/infra/blocksuite/mentionProfilePopover";
import { useCallback, useEffect, useRef, useState } from "react";

type UseBlocksuiteMentionProfilePopoverParams = {
  navigate: (to: string) => void;
  onNavigate?: (to: string) => boolean | void;
};

/**
 * mention profile popover 真正渲染在宿主页面，因此 host 侧要维护一套独立状态机。
 */
export function useBlocksuiteMentionProfilePopover(params: UseBlocksuiteMentionProfilePopoverParams) {
  const { navigate, onNavigate } = params;
  const onNavigateRef = useRef(onNavigate);
  const [mentionProfilePopover, setMentionProfilePopover] = useState<BlocksuiteMentionProfilePopoverState | null>(null);
  const mentionProfilePopoverStateRef = useRef<BlocksuiteMentionProfilePopoverState | null>(null);
  const mentionProfilePopoverHoveredRef = useRef(false);
  const mentionProfilePopoverOpenTimerRef = useRef<number | null>(null);
  const mentionProfilePopoverCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    mentionProfilePopoverStateRef.current = mentionProfilePopover;
  }, [mentionProfilePopover]);

  const clearMentionProfilePopoverOpenTimer = useCallback(() => {
    const timerId = mentionProfilePopoverOpenTimerRef.current;
    if (timerId !== null) {
      mentionProfilePopoverOpenTimerRef.current = null;
      try {
        window.clearTimeout(timerId);
      }
      catch {
      }
    }
  }, []);

  const clearMentionProfilePopoverCloseTimer = useCallback(() => {
    const timerId = mentionProfilePopoverCloseTimerRef.current;
    if (timerId !== null) {
      mentionProfilePopoverCloseTimerRef.current = null;
      try {
        window.clearTimeout(timerId);
      }
      catch {
      }
    }
  }, []);

  const scheduleMentionProfilePopoverClose = useCallback(() => {
    clearMentionProfilePopoverCloseTimer();
    mentionProfilePopoverCloseTimerRef.current = window.setTimeout(() => {
      if (mentionProfilePopoverHoveredRef.current)
        return;
      setMentionProfilePopover(null);
    }, 160);
  }, [clearMentionProfilePopoverCloseTimer]);

  const scheduleMentionProfilePopoverOpen = useCallback((next: BlocksuiteMentionProfilePopoverState) => {
    clearMentionProfilePopoverOpenTimer();
    clearMentionProfilePopoverCloseTimer();
    mentionProfilePopoverOpenTimerRef.current = window.setTimeout(() => {
      mentionProfilePopoverOpenTimerRef.current = null;
      mentionProfilePopoverHoveredRef.current = false;
      setMentionProfilePopover(next);
    }, 240);
  }, [clearMentionProfilePopoverCloseTimer, clearMentionProfilePopoverOpenTimer]);

  const handleMentionClickMessage = useCallback((userId: string) => {
    try {
      clearMentionProfilePopoverCloseTimer();
      setMentionProfilePopover(null);
      const to = `/profile/${encodeURIComponent(userId)}`;
      const handled = onNavigateRef.current?.(to);
      if (handled === true) {
        return;
      }
      navigate(to);
    }
    catch {
    }
  }, [clearMentionProfilePopoverCloseTimer, navigate]);

  const handleMentionHoverMessage = useCallback((data: any) => {
    if (data.state === "enter") {
      const anchorRect = data.anchorRect as any;
      const anchorRectOk = Boolean(anchorRect)
        && typeof anchorRect.left === "number"
        && typeof anchorRect.top === "number"
        && typeof anchorRect.right === "number"
        && typeof anchorRect.bottom === "number"
        && typeof anchorRect.width === "number"
        && typeof anchorRect.height === "number";

      if (!anchorRectOk)
        return;

      try {
        scheduleMentionProfilePopoverOpen({ userId: data.userId, anchorRect });
      }
      catch {
      }
      return;
    }

    if (data.state === "leave") {
      try {
        const current = mentionProfilePopoverStateRef.current;
        if (!current) {
          clearMentionProfilePopoverOpenTimer();
          return;
        }
        if (current.userId !== data.userId)
          return;
        clearMentionProfilePopoverOpenTimer();
        scheduleMentionProfilePopoverClose();
      }
      catch {
      }
    }
  }, [clearMentionProfilePopoverOpenTimer, scheduleMentionProfilePopoverClose, scheduleMentionProfilePopoverOpen]);

  useEffect(() => {
    if (!mentionProfilePopover)
      return;
    if (typeof window === "undefined")
      return;

    const close = () => {
      clearMentionProfilePopoverOpenTimer();
      clearMentionProfilePopoverCloseTimer();
      setMentionProfilePopover(null);
    };

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close, true);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close, true);
    };
  }, [clearMentionProfilePopoverCloseTimer, clearMentionProfilePopoverOpenTimer, mentionProfilePopover]);

  return {
    mentionProfilePopover,
    setMentionProfilePopover,
    clearMentionProfilePopoverCloseTimer,
    scheduleMentionProfilePopoverClose,
    setMentionProfilePopoverHovered(hovered: boolean) {
      mentionProfilePopoverHoveredRef.current = hovered;
    },
    handleMentionClickMessage,
    handleMentionHoverMessage,
  };
}
