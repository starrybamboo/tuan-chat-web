import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMobileRoomMessageRequestId,
  parseMobileRoomMessageSendResult,
  registerMobileRoomMessageWebSocketSender,
  trySendMobileRoomMessageByWebSocket,
} from "./mobileRoomMessageTransport";

const REQUEST: ChatMessageRequest = {
  content: "hello",
  extra: {},
  messageType: 1,
  roomId: 9,
};

const SENT_MESSAGE = {
  content: "hello",
  messageId: 101,
  messageType: 1,
  position: 0,
  roomId: 9,
  status: 0,
  syncId: 202,
  userId: 7,
};

afterEach(() => {
  registerMobileRoomMessageWebSocketSender(null);
});

describe("mobileRoomMessageTransport", () => {
  it("为连续发送生成不同的可关联请求 ID", () => {
    const first = createMobileRoomMessageRequestId();
    const second = createMobileRoomMessageRequestId();

    expect(first).toMatch(/^mobile-[a-z0-9]+-[a-z0-9]+$/);
    expect(second).not.toBe(first);
  });

  it("注册 WebSocket 发送器并在注销后回到 HTTP 降级状态", async () => {
    const sender = vi.fn(async (requestId: string) => ({
      message: SENT_MESSAGE,
      requestId,
      success: true,
    }));
    const unregister = registerMobileRoomMessageWebSocketSender(sender);

    await expect(trySendMobileRoomMessageByWebSocket("mobile-1", REQUEST)).resolves.toMatchObject({
      message: { messageId: 101, syncId: 202 },
      requestId: "mobile-1",
      success: true,
    });
    expect(sender).toHaveBeenCalledWith("mobile-1", REQUEST);

    unregister();
    expect(trySendMobileRoomMessageByWebSocket("mobile-2", REQUEST)).toBeNull();
  });

  it("解析成功和失败 ACK 并拒绝无效载荷", () => {
    expect(parseMobileRoomMessageSendResult({
      message: { messageId: 101, syncId: 202 },
      requestId: "mobile-1",
      success: true,
    })).toMatchObject({ requestId: "mobile-1", success: true });
    expect(parseMobileRoomMessageSendResult({
      error: "空间已归档",
      requestId: "mobile-2",
      success: false,
    })).toEqual({
      error: "空间已归档",
      message: null,
      requestId: "mobile-2",
      success: false,
    });
    expect(parseMobileRoomMessageSendResult({ requestId: "mobile-3", success: true })).toBeNull();
  });
});
