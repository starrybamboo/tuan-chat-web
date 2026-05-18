import type { ChatMessageResponse } from "../../../../../api";

import { collectPersistedOptimisticDuplicateIds } from "./chatHistoryOptimistic";

function createMessageResponse(
  overrides: Partial<ChatMessageResponse["message"]>,
): ChatMessageResponse {
  return {
    message: {
      messageId: 1,
      syncId: 1,
      roomId: 10,
      userId: 20,
      roleId: 30,
      content: "素材",
      status: 0,
      messageType: 2,
      position: 1,
      createTime: "2026-03-30 20:00:00",
      updateTime: "2026-03-30 20:00:00",
      ...overrides,
    },
  };
}

describe("chatHistoryOptimistic", () => {
  it("能识别已持久化的批量乐观残影", () => {
    const duplicateIds = collectPersistedOptimisticDuplicateIds([
      createMessageResponse({
        messageId: -1,
        syncId: -1,
        position: 100,
        extra: {
          imageMessage: {
            fileId: 42,
            mediaType: "image",
            width: 100,
            height: 100,
          },
        } as any,
      }),
      createMessageResponse({
        messageId: 101,
        syncId: 501,
        position: 501,
        extra: {
          imageMessage: {
            fileId: 42,
            mediaType: "image",
            width: 100,
            height: 100,
          },
        } as any,
      }),
    ]);

    expect(duplicateIds).toEqual([-1]);
  });

  it("不会把正常历史消息误判为残影", () => {
    const duplicateIds = collectPersistedOptimisticDuplicateIds([
      createMessageResponse({
        messageId: -1,
        syncId: -1,
        messageType: 1,
        content: "素材A",
      }),
      createMessageResponse({
        messageId: 101,
        syncId: 501,
        messageType: 1,
        content: "素材B",
      }),
    ]);

    expect(duplicateIds).toEqual([]);
  });
});
