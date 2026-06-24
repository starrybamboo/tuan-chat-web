import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseRoomMessagePushPayload, useWebSocketMessageHandlers } from "./useWebSocketMessageHandlers";

function createRoomMessage(messageId: number): ChatMessageResponse {
  return {
    message: {
      content: `message-${messageId}`,
      extra: {},
      messageId,
      messageType: 1,
      position: messageId,
      roomId: 9,
      status: 0,
      syncId: messageId,
      userId: 7,
    },
  };
}

function createImmerUpdater<T>(target: T) {
  return (recipe: (draft: T) => void) => {
    recipe(target);
  };
}

describe("parseRoomMessagePushPayload", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("保留现有单条 MESSAGE payload 兼容", () => {
    const message = createRoomMessage(1);

    expect(parseRoomMessagePushPayload(4, message)).toEqual([message]);
    expect(parseRoomMessagePushPayload(4, { message: null })).toEqual([]);
  });

  it("解析批量 MESSAGE_BATCH payload 并过滤无效项", () => {
    const first = createRoomMessage(1);
    const second = createRoomMessage(2);

    expect(parseRoomMessagePushPayload(25, [first, null, {}, second])).toEqual([first, second]);
    expect(parseRoomMessagePushPayload(25, first)).toEqual([]);
  });

  it("收到缺少 createTime 的群聊 WS 消息时不写入本机当前时间", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026/05/21 20:01:00"));
    const incoming = createRoomMessage(3);
    incoming.message.updateTime = "2026-05-21 12:00:00";

    const receivedMessages: Record<number, ChatMessageResponse[]> = {};
    const receivedMessagesRef = { current: {} as Record<number, ChatMessageResponse[]> };
    const receivedDirectMessages: Record<number, any[]> = {};
    const chatStatus: Record<number, any[]> = {};
    const sink: { onMessage?: (message: { type: number; data: unknown }) => void } = {};

    function Harness() {
      const { onMessage } = useWebSocketMessageHandlers({
        queryClient: {
          invalidateQueries: vi.fn(),
          setQueryData: vi.fn(),
          getQueryData: vi.fn(),
        } as any,
        wsRef: { current: null },
        closingRef: { current: false },
        reconnectAttempts: { current: 0 },
        receivedMessagesRef,
        optimisticDirectMessageRequestMapRef: { current: new Map() },
        unhandledWsTypes: { current: new Set() },
        connect: vi.fn(),
        cleanupRoomDescriptionDocOnDissolve: vi.fn(),
        notifyNewDirectMessage: vi.fn(async () => undefined),
        notifyNewFriendRequest: vi.fn(async () => undefined),
        notifyNewGroupMessage: vi.fn(async () => undefined),
        notifyNewUserNotification: vi.fn(async () => undefined),
        resolveSelfUserId: () => 999,
        syncWsDebugToWindow: vi.fn(),
        updateChatStatus: createImmerUpdater(chatStatus),
        updateLatestSyncId: vi.fn(),
        updateReceivedDirectMessages: createImmerUpdater(receivedDirectMessages),
        updateReceivedMessages: createImmerUpdater(receivedMessages),
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({ type: 4, data: incoming });

    expect(receivedMessages[9]?.[0]?.message.createTime).toBeUndefined();
    expect(receivedMessages[9]?.[0]?.message.updateTime).toBe("2026-05-21 12:00:00");
    expect(incoming.message.createTime).toBeUndefined();
  });
});
