import { describe, expect, it } from "vitest";

import {
  isWithinBottomThreshold,
  resolveMessageScrollFallbackOffset,
  resolveBottomThresholdTransition,
  resolveVisibleMessageAppendAction,
  shouldAnimateMessageJump,
  shouldAutoScrollOnContentSizeChange,
} from "./messageListScrollState";

describe("messageListScrollState", () => {
  it("按阈值判断是否仍在底部区域", () => {
    expect(isWithinBottomThreshold(0)).toBe(true);
    expect(isWithinBottomThreshold(49)).toBe(true);
    expect(isWithinBottomThreshold(50)).toBe(false);
    expect(isWithinBottomThreshold(120)).toBe(false);
  });

  it("只有跨越底部阈值时才报告状态变化", () => {
    expect(resolveBottomThresholdTransition(true, 10)).toEqual({ changed: false, isAtBottom: true });
    expect(resolveBottomThresholdTransition(true, 80)).toEqual({ changed: true, isAtBottom: false });
    expect(resolveBottomThresholdTransition(false, 120)).toEqual({ changed: false, isAtBottom: false });
    expect(resolveBottomThresholdTransition(false, 0)).toEqual({ changed: true, isAtBottom: true });
  });

  it("底部收到新消息时应保持贴底", () => {
    expect(resolveVisibleMessageAppendAction({
      isAtBottom: true,
      nextLength: 4,
      previousLength: 3,
    })).toEqual({
      addedCount: 1,
      shouldCountNewMessages: false,
      shouldScrollToBottom: true,
    });
  });

  it("离开底部收到新消息时只计数不强制跳底", () => {
    expect(resolveVisibleMessageAppendAction({
      isAtBottom: false,
      nextLength: 6,
      previousLength: 4,
    })).toEqual({
      addedCount: 2,
      shouldCountNewMessages: true,
      shouldScrollToBottom: false,
    });
  });

  it("离开底部主动发送新消息时强制贴底且不计未读", () => {
    expect(resolveVisibleMessageAppendAction({
      isAtBottom: false,
      nextLength: 5,
      previousLength: 4,
      shouldForceScrollToBottom: true,
    })).toEqual({
      addedCount: 1,
      shouldCountNewMessages: false,
      shouldScrollToBottom: true,
    });
  });

  it("底部内容尺寸变化时不额外触发贴底滚动", () => {
    expect(shouldAutoScrollOnContentSizeChange({
      hasPendingScrollToBottom: false,
      isAtBottom: true,
    })).toBe(false);
  });

  it("待贴底滚动尚未完成时内容尺寸变化会再次贴底", () => {
    expect(shouldAutoScrollOnContentSizeChange({
      hasPendingScrollToBottom: true,
      isAtBottom: false,
    })).toBe(true);
  });

  it("用户离开底部且没有待贴底请求时不强制跳底", () => {
    expect(shouldAutoScrollOnContentSizeChange({
      hasPendingScrollToBottom: false,
      isAtBottom: false,
    })).toBe(false);
  });

  it("按平均行高计算未测量消息的滚动回退位置", () => {
    expect(resolveMessageScrollFallbackOffset(5, 48)).toBe(240);
    expect(resolveMessageScrollFallbackOffset(0, 48)).toBe(0);
    expect(resolveMessageScrollFallbackOffset(5, 0)).toBe(0);
  });

  it("回复目标较远时瞬间跳转，较近时保留动画", () => {
    expect(shouldAnimateMessageJump(8, 0)).toBe(true);
    expect(shouldAnimateMessageJump(40, 0)).toBe(false);
    expect(shouldAnimateMessageJump(40, 40 * 72 - 200)).toBe(true);
  });
});
