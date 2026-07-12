import { describe, expect, it } from "vitest";

import { parseMobileChatStatusEvent } from "./mobileChatStatus";

describe("mobileChatStatus", () => {
  it("解析结构化聊天状态 payload", () => {
    expect(parseMobileChatStatusEvent({
      roomId: 9,
      status: {
        description: "正在构思",
        type: "input",
      },
      userId: 7,
    })).toEqual({
      roomId: 9,
      status: {
        description: "正在构思",
        type: "input",
      },
      userId: 7,
    });
  });

  it("拒绝旧字符串聊天状态 payload", () => {
    expect(parseMobileChatStatusEvent({
      roomId: 9,
      status: "input",
      userId: 7,
    })).toBeNull();
  });
});
