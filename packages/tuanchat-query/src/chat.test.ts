import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { describe, expect, it, vi } from "vitest";

import {
  getRoomMessageSyncGapStart,
  markRoomMessageDeletedData,
  markRoomMessagesDeleted,
  mergeRoomMessages,
  patchInsertMessages,
  selectVisibleMainRoomMessages,
  upsertRoomMessagesListData,
} from "./chat";

type MockFn = (...args: any[]) => any;

function createChatMessageResponse(
  messageId: number,
  position: number,
  overrides: Partial<ChatMessageResponse["message"]> = {},
): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      messageId,
      messageType: 1,
      position,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
      ...overrides,
    },
  };
}

describe("chat room message helpers", () => {
  it("会按 messageId 去重并按 position 排序", () => {
    const oldMessage = createChatMessageResponse(2, 20, {
      content: "旧内容",
    });
    const updatedMessage = createChatMessageResponse(2, 20, {
      content: "新内容",
    });

    expect(mergeRoomMessages(
      [createChatMessageResponse(3, 30), oldMessage],
      [createChatMessageResponse(1, 10), updatedMessage],
    )).toEqual([
      createChatMessageResponse(1, 10),
      updatedMessage,
      createChatMessageResponse(3, 30),
    ]);
  });

  it("已删除消息不会被后续未删除快照覆盖回去", () => {
    const deletedMessage = createChatMessageResponse(2, 20, {
      content: "已删除",
      status: 1,
    });
    const staleMessage = createChatMessageResponse(2, 20, {
      content: "旧快照",
      status: 0,
    });

    expect(mergeRoomMessages(
      [createChatMessageResponse(1, 10)],
      [deletedMessage],
      [staleMessage],
    )).toEqual([
      createChatMessageResponse(1, 10),
      deletedMessage,
    ]);
  });

  it("支持移动端全量列表 upsert 和删除标记", () => {
    const current = [
      createChatMessageResponse(1, 10),
      createChatMessageResponse(2, 20),
    ];

    const next = upsertRoomMessagesListData(current, [
      createChatMessageResponse(2, 20, { content: "更新" }),
      createChatMessageResponse(3, 30),
    ]);

    expect(next).toEqual([
      createChatMessageResponse(1, 10),
      createChatMessageResponse(2, 20, { content: "更新" }),
      createChatMessageResponse(3, 30),
    ]);

    expect(markRoomMessageDeletedData(next, 2)[1].message.status).toBe(1);
  });

  it("支持批量标记消息删除", () => {
    const next = markRoomMessagesDeleted([
      createChatMessageResponse(1, 10),
      createChatMessageResponse(2, 20),
      createChatMessageResponse(3, 30),
    ], [1, 3]);

    expect(next.map(item => [item.message.messageId, item.message.status])).toEqual([
      [1, 1],
      [2, 0],
      [3, 1],
    ]);
  });

  it("过滤无权查看的暗骰", () => {
    const visible = createChatMessageResponse(1, 10);
    const hiddenDice = createChatMessageResponse(3, 30, {
      extra: { diceResult: { hidden: true, result: "1d20=20" } },
      messageType: 6,
      userId: 8,
    });

    expect(selectVisibleMainRoomMessages([visible, hiddenDice], {
      currentUserId: 7,
      hasHostPrivileges: false,
    })).toEqual([visible]);

    expect(selectVisibleMainRoomMessages([hiddenDice], {
      currentUserId: 7,
      hasHostPrivileges: true,
    })).toEqual([hiddenDice]);
  });

  it("保留 diceTurn 消息但继续隐藏旧式暗骰", () => {
    const visible = createChatMessageResponse(1, 10);
    const turnDice = createChatMessageResponse(4, 40, {
      content: ".r 1d20",
      extra: {
        diceResult: { hidden: true, result: "1d20=20" },
        diceTurn: {
          command: ".r 1d20",
          replies: [{ content: "1d20=20", hidden: true }],
        },
      },
      messageType: 6,
      userId: 8,
    });

    expect(selectVisibleMainRoomMessages([visible, turnDice], {
      currentUserId: 7,
      hasHostPrivileges: false,
    })).toEqual([visible, turnDice]);
  });

  it("检测实时消息 syncId 缺口", () => {
    const current = [
      createChatMessageResponse(1, 10, { syncId: 1 }),
      createChatMessageResponse(2, 20, { syncId: 2 }),
    ];

    expect(getRoomMessageSyncGapStart(current, createChatMessageResponse(4, 40, { syncId: 4 }))).toBe(3);
    expect(getRoomMessageSyncGapStart(current, createChatMessageResponse(3, 30, { syncId: 3 }))).toBeNull();
    expect(getRoomMessageSyncGapStart(current, createChatMessageResponse(2, 40, { syncId: 4 }))).toBeNull();
  });

  it("批量插入消息时可透传 mutationMeta", async () => {
    const patchRoomMessages = vi.fn<MockFn>(async () => ({ data: [], success: true }));

    await patchInsertMessages({
      chatController: {
        patchRoomMessages,
      },
    } as any, [{
      content: "导入消息",
      messageType: 1,
      roomId: 9,
    }], {
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "import",
      },
    });

    expect(patchRoomMessages).toHaveBeenCalledWith({
      mutationMeta: {
        operationCause: "normal",
        sourceSurface: "import",
      },
      operations: [{
        message: {
          content: "导入消息",
          messageType: 1,
        },
        op: "insert",
      }],
      roomId: 9,
    });
  });

  it("批量插入消息未传 mutationMeta 时保持旧请求形状", async () => {
    const patchRoomMessages = vi.fn<MockFn>(async () => ({ data: [], success: true }));

    await patchInsertMessages({
      chatController: {
        patchRoomMessages,
      },
    } as any, [{
      content: "普通消息",
      messageType: 1,
      roomId: 9,
    }]);

    expect(patchRoomMessages).toHaveBeenCalledWith({
      operations: [{
        message: {
          content: "普通消息",
          messageType: 1,
        },
        op: "insert",
      }],
      roomId: 9,
    });
  });
});
