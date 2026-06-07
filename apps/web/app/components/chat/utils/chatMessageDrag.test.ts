import { describe, expect, it } from "vitest";

import {
  getChatMessageDragData,
  isChatMessageDrag,
  setChatMessageDragData,
} from "@/components/chat/utils/chatMessageDrag";

const CHAT_MESSAGE_DRAG_MIME = "application/x-tc-chat-message-drag";

function createMockDataTransfer() {
  const store = new Map<string, string>();
  const dataTransfer: any = {
    effectAllowed: "all",
    dropEffect: "none",
    types: [] as string[],
    setData(type: string, value: string) {
      store.set(type, value);
      dataTransfer.types = Array.from(store.keys());
    },
    getData(type: string) {
      return store.get(type) ?? "";
    },
  };
  return dataTransfer as DataTransfer;
}

describe("chatMessageDrag utils", () => {
  it("支持写入并读取消息移动 payload", () => {
    const dataTransfer = createMockDataTransfer();

    setChatMessageDragData(dataTransfer, {
      kind: "chat-message",
      sourceRoomId: 12,
      messageIds: [101, 102],
      anchorMessageId: 101,
      effect: "move",
    });

    expect(isChatMessageDrag(dataTransfer)).toBe(true);
    expect(getChatMessageDragData(dataTransfer)).toEqual({
      kind: "chat-message",
      sourceRoomId: 12,
      messageIds: [101, 102],
      anchorMessageId: 101,
      effect: "move",
    });
  });

  it("读取时会去重 messageIds 并保留原顺序", () => {
    const dataTransfer = createMockDataTransfer();
    dataTransfer.setData(CHAT_MESSAGE_DRAG_MIME, JSON.stringify({
      kind: "chat-message",
      sourceRoomId: "12",
      messageIds: [102, 101, 102],
      anchorMessageId: "101",
      effect: "move",
    }));

    expect(getChatMessageDragData(dataTransfer)?.messageIds).toEqual([102, 101]);
  });

  it("拒绝缺少消息 ID 的 payload", () => {
    const dataTransfer = createMockDataTransfer();
    dataTransfer.setData(CHAT_MESSAGE_DRAG_MIME, JSON.stringify({
      kind: "chat-message",
      sourceRoomId: 12,
      messageIds: [],
      anchorMessageId: 101,
      effect: "move",
    }));

    expect(getChatMessageDragData(dataTransfer)).toBeNull();
  });

  it("拒绝非消息移动 payload", () => {
    const dataTransfer = createMockDataTransfer();
    dataTransfer.setData(CHAT_MESSAGE_DRAG_MIME, JSON.stringify({
      kind: "chat-message",
      sourceRoomId: 12,
      messageIds: [101],
      anchorMessageId: 101,
      effect: "copy",
    }));

    expect(getChatMessageDragData(dataTransfer)).toBeNull();
  });

  it("未包含消息 MIME 时不识别为消息拖拽", () => {
    const dataTransfer = createMockDataTransfer();
    dataTransfer.setData("text/plain", "hello");

    expect(isChatMessageDrag(dataTransfer)).toBe(false);
    expect(getChatMessageDragData(dataTransfer)).toBeNull();
  });
});
