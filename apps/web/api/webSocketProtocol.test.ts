import { describe, expect, it } from "vitest";

import { normalizeWebSocketRequestForSend } from "./webSocketProtocol";

describe("normalizeWebSocketRequestForSend", () => {
  it("会把业务对象 payload 序列化为后端 WSBaseReq.data 需要的字符串", () => {
    expect(normalizeWebSocketRequestForSend({
      type: 5,
      data: {
        receiverId: 8,
        content: "hello",
        messageType: 1,
        extra: {},
      },
    })).toEqual({
      type: 5,
      data: JSON.stringify({
        receiverId: 8,
        content: "hello",
        messageType: 1,
        extra: {},
      }),
    });
  });

  it("保留无 payload 与已序列化 payload", () => {
    expect(normalizeWebSocketRequestForSend({ type: 2 })).toEqual({ type: 2 });
    expect(normalizeWebSocketRequestForSend({ type: 3, data: "{\"roomId\":1}" })).toEqual({
      type: 3,
      data: "{\"roomId\":1}",
    });
  });
});
