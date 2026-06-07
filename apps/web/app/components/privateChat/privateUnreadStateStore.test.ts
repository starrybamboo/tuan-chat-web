import { beforeEach, describe, expect, it } from "vitest";

import { mergeOptimisticReadSyncMap, usePrivateUnreadStateStore } from "./privateUnreadStateStore";

describe("privateUnreadStateStore", () => {
  beforeEach(() => {
    usePrivateUnreadStateStore.getState().reset();
  });

  it("只允许乐观已读 sync 向前推进", () => {
    expect(mergeOptimisticReadSyncMap({}, 42, 12)).toEqual({ 42: 12 });
    expect(mergeOptimisticReadSyncMap({ 42: 12 }, 42, 8)).toEqual({ 42: 12 });
  });

  it("reset 会清空共享的乐观已读状态", () => {
    const store = usePrivateUnreadStateStore.getState();
    store.markContactAsRead(42, 12);
    expect(usePrivateUnreadStateStore.getState().optimisticReadSyncMap).toEqual({ 42: 12 });

    store.reset();
    expect(usePrivateUnreadStateStore.getState().optimisticReadSyncMap).toEqual({});
  });
});
