import { describe, expect, it } from "vitest";

import { roomBaseArchiveMessagesQueryKey } from "./useRoomBaseArchiveMessages";

describe("useRoomBaseArchiveMessages", () => {
  it("按房间和归档提交隔离基础消息缓存", () => {
    expect(roomBaseArchiveMessagesQueryKey(1, 10)).not.toEqual(roomBaseArchiveMessagesQueryKey(1, 11));
    expect(roomBaseArchiveMessagesQueryKey(1, 10)).not.toEqual(roomBaseArchiveMessagesQueryKey(2, 10));
  });
});
