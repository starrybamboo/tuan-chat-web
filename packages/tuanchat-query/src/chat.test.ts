import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { flattenRoomMessagePages, mergeRoomMessages, upsertRoomMessagesInfiniteData } from "./chat";

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
});
