import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../api";

import { getChatFrameItemKey } from "./chatFrameList";

function buildMessage(partial: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: 0,
      position: 0,
      ...partial,
    } as ChatMessageResponse["message"],
  };
}

describe("getChatFrameItemKey", () => {
  it("乐观消息优先使用 stable key", () => {
    const key = getChatFrameItemKey(0, buildMessage({
      messageId: -1,
      __tcStableKey: "dice:1",
    } as any));

    expect(key).toBe("stable:dice:1");
  });

  it("已提交消息同样优先使用 stable key", () => {
    const key = getChatFrameItemKey(0, buildMessage({
      messageId: 101,
      __tcStableKey: "dice:1",
    } as any));

    expect(key).toBe("stable:dice:1");
  });

  it("stable key 为新版格式时仍然可用", () => {
    const key = getChatFrameItemKey(0, buildMessage({
      messageId: 102,
      __tcStableKey: "dicev2:10:1700000000000:1:1",
    } as any));

    expect(key).toBe("stable:dicev2:10:1700000000000:1:1");
  });

  it("缺少 messageId 时按 position 生成 key", () => {
    const key = getChatFrameItemKey(0, buildMessage({
      messageId: Number.NaN,
      position: 42.5,
    }));

    expect(key).toBe("pos:42.500000");
  });

  it("无法解析时回退到 index key", () => {
    const key = getChatFrameItemKey(7, buildMessage({
      messageId: Number.NaN,
      position: Number.NaN,
    }));

    expect(key).toBe("idx:7");
  });
});
