import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import {
  flattenRoomMessagePages,
  getRoomMessageSyncGapStart,
  markRoomMessageDeletedData,
  markRoomMessagesDeleted,
  mergeRoomMessages,
  selectVisibleMainRoomMessages,
  upsertRoomMessagesInfiniteData,
  upsertRoomMessagesListData,
} from "./chat";

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

  it("扁平化分页消息时也会复用同一套去重规则", () => {
    expect(flattenRoomMessagePages([
      {
        data: {
          list: [createChatMessageResponse(3, 30), createChatMessageResponse(1, 10)],
        },
      },
      {
        data: {
          list: [createChatMessageResponse(2, 20), createChatMessageResponse(1, 10, {
            content: "第一页更新版",
          })],
        },
      },
    ])).toEqual([
      createChatMessageResponse(1, 10, {
        content: "第一页更新版",
      }),
      createChatMessageResponse(2, 20),
      createChatMessageResponse(3, 30),
    ]);
  });

  it("实时插入新消息时只回写第一页，保留历史页游标", () => {
    const currentData = {
      pageParams: [{
        pageSize: 20,
        roomId: 9,
      }],
      pages: [{
        success: true,
        data: {
          cursor: 120,
          isLast: false,
          list: [createChatMessageResponse(2, 20), createChatMessageResponse(3, 30)],
        },
      }, {
        success: true,
        data: {
          cursor: 60,
          isLast: true,
          list: [createChatMessageResponse(1, 10)],
        },
      }],
    };

    expect(upsertRoomMessagesInfiniteData(currentData, 9, [
      createChatMessageResponse(4, 40),
      createChatMessageResponse(3, 30, {
        content: "来自 ws 的更新版",
      }),
    ])).toEqual({
      pageParams: currentData.pageParams,
      pages: [{
        success: true,
        data: {
          cursor: 120,
          isLast: false,
          list: [
            createChatMessageResponse(2, 20),
            createChatMessageResponse(3, 30, {
              content: "来自 ws 的更新版",
            }),
            createChatMessageResponse(4, 40),
          ],
        },
      }, currentData.pages[1]],
    });
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

  it("过滤 thread reply 和无权查看的暗骰", () => {
    const visible = createChatMessageResponse(1, 10);
    const threadReply = createChatMessageResponse(2, 20, { threadId: 99 });
    const hiddenDice = createChatMessageResponse(3, 30, {
      extra: { diceResult: { hidden: true, result: "1d20=20" } },
      messageType: 6,
      userId: 8,
    });

    expect(selectVisibleMainRoomMessages([visible, threadReply, hiddenDice], {
      currentUserId: 7,
      hasHostPrivileges: false,
    })).toEqual([visible]);

    expect(selectVisibleMainRoomMessages([hiddenDice], {
      currentUserId: 7,
      hasHostPrivileges: true,
    })).toEqual([hiddenDice]);
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
});
