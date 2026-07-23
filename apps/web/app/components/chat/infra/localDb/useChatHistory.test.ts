import { mergeRoomMessagesForLocalState } from "@tuanchat/query/room-message-lifecycle";
import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../../api";

import {
  getRoomHistoryFetchStartSyncId,
  mergeIncomingRoomMessagesWithEditorProtection,
  mergeLoadedRoomHistory,
} from "./useChatHistory";

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
  it("远端不同消息正常合入，同一 dirty 消息保留本地编辑字段并吸收确认字段", () => {
    const localDirty = createMessageResponse({ content: "本地内容", messageId: 1, position: 1, syncId: 1 });
    const remoteConflict = createMessageResponse({ content: "远端冲突", messageId: 1, position: 9, syncId: 8 });
    const remoteOther = createMessageResponse({ content: "远端新增", messageId: 2, position: 2, syncId: 2 });

    const result = mergeIncomingRoomMessagesWithEditorProtection(
      [localDirty],
      [remoteConflict, remoteOther],
      new Set([1]),
    );

    expect(result.map(item => item.message.content)).toEqual(["本地内容", "远端新增"]);
    expect(result.find(item => item.message.messageId === 1)?.message).toMatchObject({
      content: "本地内容",
      position: 1,
      syncId: 8,
    });
  });

  it("待删除消息不会被 WebSocket 或补拉结果重新放回 Query", () => {
    const incoming = createMessageResponse({ content: "远端旧值", messageId: 1, syncId: 9 });

    expect(mergeIncomingRoomMessagesWithEditorProtection(
      [],
      [incoming],
      new Set([1]),
      new Set([1]),
    )).toEqual([]);
  });

  it("没有本地 operation 的 synced 消息接受服务端完整校准", () => {
    const current = createMessageResponse({ content: "旧内容", messageId: 1, position: 1, syncId: 1 });
    const incoming = createMessageResponse({ content: "服务端内容", messageId: 1, position: 3, syncId: 9 });

    const [merged] = mergeIncomingRoomMessagesWithEditorProtection([current], [incoming], new Set());

    expect(merged.message).toMatchObject({ content: "服务端内容", position: 3, syncId: 9 });
  });

  it("远端增量缺少 editor 尺寸时保留已持久化的本地媒体布局", () => {
    const local = createMessageResponse({
      extra: { videoMessage: { editorHeight: 405, editorWidth: 720, fileId: 7, height: 1080, width: 1920 } } as any,
      messageId: 7,
      messageType: MESSAGE_TYPE.VIDEO,
    });
    const remote = createMessageResponse({
      extra: { videoMessage: { fileId: 7, height: 1080, width: 1920 } } as any,
      messageId: 7,
      messageType: MESSAGE_TYPE.VIDEO,
      syncId: 8,
    });

    const [merged] = mergeIncomingRoomMessagesWithEditorProtection([local], [remote], new Set());

    expect(merged.message.syncId).toBe(8);
    expect((merged.message.extra?.videoMessage as { editorHeight?: number; editorWidth?: number } | undefined))
      .toMatchObject({ editorHeight: 405, editorWidth: 720 });
  });

  it("编辑器确认携带新尺寸时不会被 Query 中的旧布局覆盖", () => {
    const current = createMessageResponse({
      extra: { videoMessage: { editorHeight: 199, editorWidth: 354, fileId: 7, height: 1080, width: 1920 } } as any,
      messageId: 7,
      messageType: MESSAGE_TYPE.VIDEO,
    });
    const committed = createMessageResponse({
      extra: { videoMessage: { editorHeight: 182, editorWidth: 324, fileId: 7, height: 1080, width: 1920 } } as any,
      messageId: 7,
      messageType: MESSAGE_TYPE.VIDEO,
      syncId: 8,
    });

    const [merged] = mergeIncomingRoomMessagesWithEditorProtection([current], [committed], new Set());

    expect((merged.message.extra?.videoMessage as { editorHeight?: number; editorWidth?: number } | undefined))
      .toMatchObject({ editorHeight: 182, editorWidth: 324 });
  });

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
