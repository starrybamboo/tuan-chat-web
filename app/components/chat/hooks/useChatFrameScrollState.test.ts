import { describe, expect, it } from "vitest";

import {
  resolveChatFrameScrollToBottomLocation,
  resolveReadSyncIdOnRoomExit,
  resolveShouldAutoScrollAfterHistoryLoad,
} from "./useChatFrameScrollState";

function createHistoryMessage(syncId: number) {
  return {
    message: {
      syncId,
    },
  } as any;
}

describe("useChatFrameScrollState", () => {
  it("自动滚到底部时对齐底部，避免最后一条先被顶到列表顶部", () => {
    expect(resolveChatFrameScrollToBottomLocation(6)).toEqual({
      align: "end",
      behavior: "auto",
      index: 6,
    });
  });

  it("筛选隐藏消息时会暂停加载完成后的兜底滚底，避免虚拟列表反复重排", () => {
    expect(resolveShouldAutoScrollAfterHistoryLoad({
      loading: false,
      hasAutoScrolledAfterLoad: false,
      isAtBottom: true,
      suppressAutoScroll: true,
    })).toBe(false);
  });

  it("用户离开房间时若仍在底部，会补记最后一条消息为已读", () => {
    const syncId = resolveReadSyncIdOnRoomExit({
      enableUnreadIndicator: true,
      historyMessages: [createHistoryMessage(3), createHistoryMessage(5)],
      isAtBottom: true,
      lastSyncedMessageSyncId: 3,
    });

    expect(syncId).toBe(5);
  });

  it("用户不在底部离开房间时，不会强行清掉红点", () => {
    const syncId = resolveReadSyncIdOnRoomExit({
      enableUnreadIndicator: true,
      historyMessages: [createHistoryMessage(3), createHistoryMessage(5)],
      isAtBottom: false,
      lastSyncedMessageSyncId: 3,
    });

    expect(syncId).toBeNull();
  });

  it("最后消息已同步过时，不会重复触发离开兜底已读", () => {
    const syncId = resolveReadSyncIdOnRoomExit({
      enableUnreadIndicator: true,
      historyMessages: [createHistoryMessage(7)],
      isAtBottom: true,
      lastSyncedMessageSyncId: 7,
    });

    expect(syncId).toBeNull();
  });
});
