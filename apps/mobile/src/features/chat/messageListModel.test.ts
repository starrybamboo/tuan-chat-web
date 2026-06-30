import type { Message } from "@tuanchat/openapi-client/models/Message";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import type { ChatMessageListItem } from "./messageListModel";

import {
  buildChatMessageListModel,
  buildVisibleMessageMap,
  getMessageListItemKey,
  getVisibleMessageListSignature,
  getReplyPreviewText,
  getVisibleMessageItems,
  isVisibleRoomMessage,
} from "./messageListModel";

function makeMessage(overrides: Partial<Message>): Message {
  return {
    content: "",
    messageId: 1,
    messageType: MESSAGE_TYPE.TEXT,
    status: 0,
    ...overrides,
  } as Message;
}

function item(message: Message): ChatMessageListItem {
  return { message };
}

describe("messageListModel", () => {
  it("隐藏已删除消息", () => {
    expect(isVisibleRoomMessage(makeMessage({ status: 1 }))).toBe(false);
  });

  it("隐藏普通列表中的 EFFECT 消息", () => {
    expect(isVisibleRoomMessage(makeMessage({ messageType: MESSAGE_TYPE.EFFECT }))).toBe(false);
  });

  it("隐藏移动端普通列表中的状态消息", () => {
    expect(isVisibleRoomMessage(makeMessage({ messageType: MESSAGE_TYPE.STATE_EVENT, status: 0 }))).toBe(false);
  });

  it("保留普通可见消息", () => {
    expect(isVisibleRoomMessage(makeMessage({ messageType: MESSAGE_TYPE.TEXT, status: 0 }))).toBe(true);
  });

  it("从列表数据源中过滤已删除、EFFECT 和状态消息", () => {
    const visible = makeMessage({ messageId: 1, content: "可见" });
    const deleted = makeMessage({ messageId: 2, status: 1, content: "已删" });
    const effect = makeMessage({ messageId: 3, messageType: MESSAGE_TYPE.EFFECT, content: "特效" });
    const stateEvent = makeMessage({ messageId: 4, messageType: MESSAGE_TYPE.STATE_EVENT, content: "状态" });

    expect(getVisibleMessageItems([item(visible), item(deleted), item(effect), item(stateEvent)])).toEqual([item(visible)]);
  });

  it("一次构建列表模型时产出可见消息、倒序数据和回复查找表", () => {
    const first = makeMessage({ messageId: 1, content: "第一条" });
    const deleted = makeMessage({ messageId: 2, status: 1, content: "已删" });
    const second = makeMessage({ messageId: 3, content: "第二条" });
    const stateEvent = makeMessage({ messageId: 4, messageType: MESSAGE_TYPE.STATE_EVENT, content: "状态" });

    const model = buildChatMessageListModel([item(first), item(deleted), item(second), item(stateEvent)]);

    expect(model.visibleMessages).toEqual([item(first), item(second)]);
    expect(model.visibleChatMessages).toEqual([first, second]);
    expect(model.invertedData).toEqual([item(second), item(first)]);
    expect(model.messageMap.get(1)).toBe(first);
    expect(model.messageMap.get(3)).toBe(second);
    expect(model.messageMap.has(2)).toBe(false);
    expect(model.messageMap.has(4)).toBe(false);
  });

  it("列表 key 优先使用乐观消息保留下来的本地渲染 key", () => {
    const message = makeMessage({
      messageId: 50,
      syncId: 50,
      tcLocalRenderKey: "room-message:optimistic:-1",
    } as Partial<Message>);

    expect(getMessageListItemKey(message, 0)).toBe("room-message:optimistic:-1");
  });

  it("列表 key 没有本地渲染 key 时回退到 messageId", () => {
    expect(getMessageListItemKey(makeMessage({ messageId: 50, syncId: 60 }), 0)).toBe("message:50");
  });

  it("列表签名会随同长度消息身份变化而变化", () => {
    const before = getVisibleMessageListSignature([
      item(makeMessage({ messageId: -1, syncId: -1, tcLocalRenderKey: "room-message:optimistic:-1" } as Partial<Message>)),
    ]);
    const after = getVisibleMessageListSignature([
      item(makeMessage({ messageId: 50, syncId: 50, tcLocalRenderKey: "room-message:optimistic:-1" } as Partial<Message>)),
    ]);

    expect(before).not.toBe(after);
  });

  it("列表签名会随状态和更新时间变化而变化", () => {
    const before = getVisibleMessageListSignature([
      item(makeMessage({ messageId: 50, status: 0, updateTime: "2026-05-21T00:00:00.000Z" })),
    ]);
    const after = getVisibleMessageListSignature([
      item(makeMessage({ messageId: 50, status: 1, updateTime: "2026-05-21T00:00:01.000Z" })),
    ]);

    expect(before).not.toBe(after);
  });

  it("构建回复查找表时排除已删除、EFFECT 和状态消息", () => {
    const visible = makeMessage({ messageId: 10, content: "可见回复" });
    const deleted = makeMessage({ messageId: 11, status: 1, content: "不能泄露" });
    const effect = makeMessage({ messageId: 12, messageType: MESSAGE_TYPE.EFFECT, content: "特效" });
    const stateEvent = makeMessage({ messageId: 13, messageType: MESSAGE_TYPE.STATE_EVENT, content: "状态" });

    const map = buildVisibleMessageMap([item(visible), item(deleted), item(effect), item(stateEvent)]);

    expect(map.get(10)).toBe(visible);
    expect(map.has(11)).toBe(false);
    expect(map.has(12)).toBe(false);
    expect(map.has(13)).toBe(false);
  });

  it("回复预览缺失或指向已删除消息时返回 null", () => {
    const deleted = makeMessage({ messageId: 20, status: 1, content: "不能泄露" });
    const map = buildVisibleMessageMap([item(deleted)]);

    expect(getReplyPreviewText(map, undefined)).toBeNull();
    expect(getReplyPreviewText(map, 20)).toBeNull();
    expect(getReplyPreviewText(map, 404)).toBeNull();
  });

  it("回复预览会修剪并截断到 60 个字符", () => {
    const longText = `  ${"一".repeat(70)}  `;
    const visible = makeMessage({ messageId: 30, content: longText });
    const map = buildVisibleMessageMap([item(visible)]);

    expect(getReplyPreviewText(map, 30)).toBe("一".repeat(60));
  });
});
