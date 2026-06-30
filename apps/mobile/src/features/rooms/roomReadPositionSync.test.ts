import { QueryClient } from "@tanstack/react-query";
import { getUserMessageSessionsQueryKey } from "@tuanchat/query/message-sessions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRoomReadPositionSyncTimers,
  markRoomReadOptimistically,
  scheduleDebouncedRoomReadPositionSync,
  shouldAutoMarkFocusedRoomRead,
  type RoomReadPositionSyncState,
} from "./roomReadPositionSync";

function createSyncState(): RoomReadPositionSyncState {
  return {
    pendingSyncIdsByRoom: {},
    timersByRoom: {},
  };
}

describe("roomReadPositionSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("只在有效焦点房间和有效 syncId 下自动已读", () => {
    expect(shouldAutoMarkFocusedRoomRead({
      currentRoomId: 9,
      isRoomFocused: true,
      targetSyncId: 12,
    })).toBe(true);
    expect(shouldAutoMarkFocusedRoomRead({
      currentRoomId: 9,
      isRoomFocused: false,
      targetSyncId: 12,
    })).toBe(false);
    expect(shouldAutoMarkFocusedRoomRead({
      currentRoomId: null,
      isRoomFocused: true,
      targetSyncId: 12,
    })).toBe(false);
    expect(shouldAutoMarkFocusedRoomRead({
      currentRoomId: 9,
      isRoomFocused: true,
      targetSyncId: 0,
    })).toBe(false);
  });

  it("乐观更新复用会话 query cache 且不会回退已读线", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getUserMessageSessionsQueryKey(), {
      data: [{ lastReadSyncId: 3, latestSyncId: 10, roomId: 9 }],
      success: true,
    });

    markRoomReadOptimistically(queryClient, 9, 8);
    markRoomReadOptimistically(queryClient, 9, 5);

    const data = queryClient.getQueryData<{ data?: Array<{ lastReadSyncId?: number }> }>(getUserMessageSessionsQueryKey());
    expect(data?.data?.[0]?.lastReadSyncId).toBe(8);
  });

  it("同房间多次防抖调度只同步最大的 syncId", () => {
    const state = createSyncState();
    const syncNow = vi.fn();

    scheduleDebouncedRoomReadPositionSync(state, 9, 10, syncNow, 1000);
    scheduleDebouncedRoomReadPositionSync(state, 9, 8, syncNow, 1000);
    scheduleDebouncedRoomReadPositionSync(state, 9, 12, syncNow, 1000);

    vi.advanceTimersByTime(999);
    expect(syncNow).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(syncNow).toHaveBeenCalledTimes(1);
    expect(syncNow).toHaveBeenCalledWith(9, 12);
    expect(state.pendingSyncIdsByRoom[9]).toBeUndefined();
    expect(state.timersByRoom[9]).toBeUndefined();
  });

  it("清理防抖状态会取消未执行的同步", () => {
    const state = createSyncState();
    const syncNow = vi.fn();

    scheduleDebouncedRoomReadPositionSync(state, 9, 10, syncNow, 1000);
    clearRoomReadPositionSyncTimers(state);
    vi.advanceTimersByTime(1000);

    expect(syncNow).not.toHaveBeenCalled();
    expect(state.pendingSyncIdsByRoom).toEqual({});
    expect(state.timersByRoom).toEqual({});
  });
});
