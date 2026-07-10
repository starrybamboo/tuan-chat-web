import { mergeRoomMessagesForLocalState } from "@tuanchat/query/room-message-lifecycle";
import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../../../api";

import { getRoomHistoryFetchStartSyncId, mergeLoadedRoomHistory } from "./useChatHistory";

function createMessageResponse(overrides: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
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
      createTime: "2026-05-29 00:00:00",
      updateTime: "2026-05-29 00:00:00",
      ...overrides,
    } as ChatMessageResponse["message"],
  };
}

describe("useChatHistory 乐观消息渲染 key", () => {
  it("webSocket 真消息替换乐观消息时继承本地渲染 key", () => {
    const optimistic = createMessageResponse({
      messageId: -1,
      syncId: -1,
      tcLocalRenderKey: "room-message:optimistic:-1:2026-05-29T00:00:00.000Z",
      tcLocalSyncState: "optimistic",
    } as Partial<ChatMessageResponse["message"]>);
    const incoming = createMessageResponse({
      messageId: 101,
      syncId: 501,
    });

    const result = mergeRoomMessagesForLocalState([optimistic], [incoming]);

    expect(result).toHaveLength(1);
    expect(result[0].message.messageId).toBe(101);
    expect((result[0].message as any).tcLocalRenderKey).toBe("room-message:optimistic:-1:2026-05-29T00:00:00.000Z");
    expect((incoming.message as any).tcLocalRenderKey).toBeUndefined();
  });

  it("本地 tombstone 不会被旧的未删除快照复活", () => {
    const deleted = createMessageResponse({
      content: "已删除",
      messageId: 101,
      status: 1,
      syncId: 10,
    });
    const stale = createMessageResponse({
      content: "旧快照",
      messageId: 101,
      status: 0,
      syncId: 9,
    });

    const result = mergeRoomMessagesForLocalState([deleted], [stale]);

    expect(result).toHaveLength(1);
    expect(result[0].message.status).toBe(1);
    expect(result[0].message.content).toBe("已删除");
  });

  it("本地历史从高 syncId 开始时从 1 补拉，避免未挂载房间 WS 落库造成缺口", () => {
    expect(getRoomHistoryFetchStartSyncId([
      createMessageResponse({ messageId: 10, syncId: 10 }),
    ])).toBe(1);
  });

  it("本地历史中间存在 syncId 缺口时从第一个缺口补拉", () => {
    expect(getRoomHistoryFetchStartSyncId([
      createMessageResponse({ messageId: 1, syncId: 1 }),
      createMessageResponse({ messageId: 2, syncId: 2 }),
      createMessageResponse({ messageId: 10, syncId: 10 }),
    ])).toBe(3);
  });

  it("本地历史 syncId 连续时只补拉最新消息之后", () => {
    expect(getRoomHistoryFetchStartSyncId([
      createMessageResponse({ messageId: 1, syncId: 1 }),
      createMessageResponse({ messageId: 2, syncId: 2 }),
      createMessageResponse({ messageId: 3, syncId: 3 }),
    ])).toBe(4);
  });

  it("SQLite 加载期间发送首条消息时保留当前房间乐观消息", () => {
    const localHistory = [
      createMessageResponse({ messageId: 1, position: 1, roomId: 10, syncId: 1 }),
    ];
    const optimistic = createMessageResponse({
      content: "first message",
      messageId: -1,
      position: 2,
      roomId: 10,
      syncId: -1,
      tcLocalSyncState: "optimistic",
    } as Partial<ChatMessageResponse["message"]>);
    const previousRoomMessage = createMessageResponse({
      messageId: 99,
      roomId: 9,
      syncId: 99,
    });

    const result = mergeLoadedRoomHistory(10, localHistory, [previousRoomMessage, optimistic]);

    expect(result.map(item => item.message.messageId)).toEqual([1, -1]);
    expect(result[1]?.message.content).toBe("first message");
  });

});
