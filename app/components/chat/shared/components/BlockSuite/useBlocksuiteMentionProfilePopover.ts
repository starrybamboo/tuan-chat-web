import { useCallback, useEffect, useRef, useState } from "react";

import type { BlocksuiteFrameToHostPayload } from "@/components/chat/infra/blocksuite/shared/frameProtocol";

import type { BlocksuiteMentionProfilePopoverState } from "./blocksuiteMentionProfilePopover.shared";

type UseBlocksuiteMentionProfilePopoverParams = {
  navigate: (to: string) => void;
  onNavigate?: (to: string) => boolean | void;
};

/**
 * mention profile popover 真正渲染在宿主页面，因此 host 侧要维护一套独立状态机。
 */
export function useBlocksuiteMentionProfilePopover(params: UseBlocksuiteMentionProfilePopoverParams) {
  void params;
  const [mentionProfilePopover, setMentionProfilePopover] = useState<BlocksuiteMentionProfilePopoverState | null>(null);
  const mentionProfilePopoverStateRef = useRef<BlocksuiteMentionProfilePopoverState | null>(null);
  const mentionProfilePopoverHoveredRef = useRef(false);
  const mentionProfilePopoverOpenTimerRef = useRef<number | null>(null);
  const mentionProfilePopoverCloseTimerRef = useRef<number | null>(null);

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

  const openMentionProfilePopoverNow = useCallback((next: BlocksuiteMentionProfilePopoverState) => {
    clearMentionProfilePopoverOpenTimer();
    clearMentionProfilePopoverCloseTimer();
    mentionProfilePopoverHoveredRef.current = false;
    setMentionProfilePopover(next);
  }, [clearMentionProfilePopoverCloseTimer, clearMentionProfilePopoverOpenTimer]);

  const isValidAnchorRect = useCallback((anchorRect: unknown) => {
    return Boolean(anchorRect)
      && typeof (anchorRect as any).left === "number"
      && typeof (anchorRect as any).top === "number"
      && typeof (anchorRect as any).right === "number"
      && typeof (anchorRect as any).bottom === "number"
      && typeof (anchorRect as any).width === "number"
      && typeof (anchorRect as any).height === "number";
  }, []);

  const handleMentionClickMessage = useCallback((data: Extract<BlocksuiteFrameToHostPayload, { type: "mention-click" }>) => {
    try {
      const anchorRect = data.anchorRect as any;
      if (!isValidAnchorRect(anchorRect))
        return;

      openMentionProfilePopoverNow({
        targetKind: data.targetKind,
        targetId: data.targetId,
        anchorRect,
      });
    }
    catch {
    }
  }, [isValidAnchorRect, openMentionProfilePopoverNow]);

  const handleMentionHoverMessage = useCallback((data: Extract<BlocksuiteFrameToHostPayload, { type: "mention-hover" }>) => {
    if (data.state === "enter") {
      const anchorRect = data.anchorRect as any;
      if (!isValidAnchorRect(anchorRect))
        return;

      try {
        scheduleMentionProfilePopoverOpen({
          targetKind: data.targetKind,
          targetId: data.targetId,
          anchorRect,
        });
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
        if (current.targetKind !== data.targetKind || current.targetId !== data.targetId)
          return;
        clearMentionProfilePopoverOpenTimer();
        scheduleMentionProfilePopoverClose();
      }
      catch {
      }
    }
  }, [clearMentionProfilePopoverOpenTimer, isValidAnchorRect, scheduleMentionProfilePopoverClose, scheduleMentionProfilePopoverOpen]);

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
