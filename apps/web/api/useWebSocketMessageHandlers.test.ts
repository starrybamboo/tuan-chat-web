import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROOM_MESSAGES_RECEIVED_EVENT } from "@/components/chat/infra/localDb/roomMessageEvents";
import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MessageType } from "./wsModels";
import { parseRoomMessagePushPayload, useWebSocketMessageHandlers } from "./useWebSocketMessageHandlers";

const mocks = vi.hoisted(() => ({
  addOrUpdateMessagesBatch: vi.fn(async () => undefined),
  getMessageById: vi.fn(async (_messageId: number): Promise<unknown> => null),
  triggerAudioAutoPlay: vi.fn(),
}));

vi.mock("@/components/chat/infra/localDb/chatHistoryDbLoader", () => ({
  loadChatHistoryDb: vi.fn(async () => ({
    addOrUpdateMessagesBatch: mocks.addOrUpdateMessagesBatch,
    getMessageById: mocks.getMessageById,
  })),
}));

vi.mock("@/components/chat/infra/audioMessage/audioMessageAutoPlayRuntime", () => ({
  triggerAudioAutoPlay: mocks.triggerAudioAutoPlay,
}));

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
  beforeEach(() => {
    mocks.addOrUpdateMessagesBatch.mockClear();
    mocks.getMessageById.mockReset();
    mocks.getMessageById.mockResolvedValue(null);
    mocks.triggerAudioAutoPlay.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({ type: 4, data: incoming });

    expect(incoming.message.updateTime).toBe("2026-05-21 12:00:00");
    expect(incoming.message.createTime).toBeUndefined();
  });

  it("收到群聊 WS 消息时只发出房间消息事件，不在 WS handler 直接持久化", async () => {
    const incoming = createRoomMessage(4);
    const dispatchEvent = vi.fn();
    vi.stubGlobal("CustomEvent", class TestCustomEvent<T = unknown> extends Event {
      detail: T;

      constructor(type: string, init?: CustomEventInit<T>) {
        super(type);
        this.detail = init?.detail as T;
      }
    });
    vi.stubGlobal("window", { dispatchEvent });
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
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({ type: 4, data: incoming });

    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: ROOM_MESSAGES_RECEIVED_EVENT,
      detail: {
        roomId: 9,
        messages: [incoming],
      },
    }));
    expect(mocks.addOrUpdateMessagesBatch).not.toHaveBeenCalled();
  });

  it("收到结构化聊天状态时按 type 更新或清除本地状态", () => {
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
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({
      type: 17,
      data: {
        roomId: 9,
        userId: 7,
        status: { type: "input", description: "正在构思" },
      },
    });

    expect(chatStatus[9]).toEqual([{
      userId: 7,
      status: { type: "input", description: "正在构思" },
    }]);

    sink.onMessage?.({
      type: 17,
      data: {
        roomId: 9,
        userId: 7,
        status: { type: "idle", description: "空闲" },
      },
    });

    expect(chatStatus[9]).toEqual([]);
  });

  it("收到已存在 BGM annotation 的声音消息 WS 更新时不会重复自动播放", async () => {
    const incoming = createRoomMessage(5);
    incoming.message.messageType = MessageType.SOUND;
    incoming.message.annotations = [ANNOTATION_IDS.BGM];
    incoming.message.extra = {
      soundMessage: {
        source: { kind: "external", url: "https://cdn.example.com/bgm.ogg" },
      },
    } as any;
    mocks.getMessageById.mockResolvedValue({
      message: {
        ...incoming.message,
        content: "旧内容",
        annotations: [ANNOTATION_IDS.BGM],
        syncId: 4,
      },
    });

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
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({ type: 4, data: incoming });

    await vi.waitFor(() => {
      expect(mocks.getMessageById).toHaveBeenCalledWith(5);
    });
    expect(mocks.triggerAudioAutoPlay).not.toHaveBeenCalled();
  });

  it("收到新增 BGM annotation 的声音消息 WS 更新时触发自动播放", async () => {
    const incoming = createRoomMessage(6);
    incoming.message.messageType = MessageType.SOUND;
    incoming.message.annotations = [ANNOTATION_IDS.BGM];
    incoming.message.extra = {
      soundMessage: {
        source: { kind: "external", url: "https://cdn.example.com/new-bgm.ogg" },
      },
    } as any;
    mocks.getMessageById.mockResolvedValue({
      message: {
        ...incoming.message,
        annotations: [],
        syncId: 5,
      },
    });

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
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({ type: 4, data: incoming });

    await vi.waitFor(() => {
      expect(mocks.triggerAudioAutoPlay).toHaveBeenCalledWith({
        source: "ws",
        roomId: 9,
        messageId: 6,
        purpose: "bgm",
        url: "https://cdn.example.com/new-bgm.ogg",
      });
    });
  });

  it("收到编辑或删除态群聊 WS 消息时也推进会话 latestSyncId", () => {
    const incoming = createRoomMessage(8);
    incoming.message.status = 1;
    incoming.message.syncId = 88;
    const updateLatestSyncId = vi.fn();
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
        updateLatestSyncId,
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({ type: 4, data: incoming });

    expect(updateLatestSyncId).toHaveBeenCalledWith(9, 88);
  });

  it("收到私聊 WS 消息时写入 dmInbox 查询缓存而不是失效旧 key", () => {
    const chatStatus: Record<number, any[]> = {};
    const setQueryData = vi.fn();
    const invalidateQueries = vi.fn();
    const sink: { onMessage?: (message: { type: number; data: unknown }) => void } = {};

    function Harness() {
      const { onMessage } = useWebSocketMessageHandlers({
        queryClient: {
          invalidateQueries,
          setQueryData,
          getQueryData: vi.fn(),
        } as any,
        wsRef: { current: null },
        closingRef: { current: false },
        reconnectAttempts: { current: 0 },
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
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({
      type: 1,
      data: {
        messageId: 101,
        senderId: 8,
        receiverId: 999,
        userId: 999,
        syncId: 12,
        content: "hello",
        messageType: 1,
        status: 0,
        createTime: "2026-07-05 12:00:00",
      },
    });

    expect(setQueryData).toHaveBeenCalledWith(["dmInbox", 999], expect.any(Function));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dmInbox"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["directBadgeSummary"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["getInboxMessagePage"] });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["inboxMessageWithUser"] });
  });

  it("收到自己发送的私聊 WS 确认时清理 pending map 并替换 dmInbox 乐观消息", () => {
    const optimisticMessage = {
      messageId: -1,
      senderId: 999,
      receiverId: 8,
      userId: 999,
      syncId: -1,
      content: "pending",
      messageType: 1,
      status: 0,
      extra: {},
      createTime: "2026-07-05 11:59:59",
    };
    const cleanupTimer = setTimeout(() => undefined, 30_000);
    const optimisticMap = new Map<number, any>([[
      -1,
      {
        channelId: 8,
        cleanupTimer,
        createdAt: 1,
        request: {
          receiverId: 8,
          content: "pending",
          messageType: 1,
          extra: {},
        },
      },
    ]]);
    const chatStatus: Record<number, any[]> = {};
    const queryData = new Map<string, unknown>();
    const setQueryData = vi.fn((queryKey: unknown[], updater: unknown) => {
      const key = JSON.stringify(queryKey);
      const current = queryData.get(key);
      queryData.set(key, typeof updater === "function" ? (updater as (value: unknown) => unknown)(current) : updater);
    });
    const sink: { onMessage?: (message: { type: number; data: unknown }) => void } = {};

    queryData.set(JSON.stringify(["dmInbox", 999]), [optimisticMessage]);

    function Harness() {
      const { onMessage } = useWebSocketMessageHandlers({
        queryClient: {
          invalidateQueries: vi.fn(),
          setQueryData,
          getQueryData: vi.fn(),
        } as any,
        wsRef: { current: null },
        closingRef: { current: false },
        reconnectAttempts: { current: 0 },
        optimisticDirectMessageRequestMapRef: { current: optimisticMap },
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
      });
      sink.onMessage = onMessage;
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    sink.onMessage?.({
      type: 1,
      data: {
        messageId: 101,
        senderId: 999,
        receiverId: 8,
        userId: 999,
        syncId: 12,
        content: "pending",
        messageType: 1,
        status: 0,
        extra: {},
        createTime: "2026-07-05 12:00:00",
      },
    });

    expect(optimisticMap.has(-1)).toBe(false);
    expect(queryData.get(JSON.stringify(["dmInbox", 999]))).toEqual([expect.objectContaining({
      messageId: 101,
      syncId: 12,
      content: "pending",
    })]);
  });

});
