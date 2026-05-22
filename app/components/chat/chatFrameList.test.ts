import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../api";

import {
  resolveChatFrameFollowOutput,
  resolveChatFrameInitialTopMostItemIndex,
  resolveChatFrameSeenIndexFromBounds,
} from "./chatFrameList";
import { getChatFrameItemKey } from "./chatFrameListKey";

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

describe("resolveChatFrameFollowOutput", () => {
  it("仅在仍位于底部时允许自动跟随", () => {
    expect(resolveChatFrameFollowOutput(true)).toBe(true);
    expect(resolveChatFrameFollowOutput(false)).toBe(false);
  });
});

describe("resolveChatFrameInitialTopMostItemIndex", () => {
  it("初始进入房间时直接贴底渲染，避免先定位到最后一条顶部再下滑", () => {
    expect(resolveChatFrameInitialTopMostItemIndex(3)).toEqual({
      align: "end",
      behavior: "auto",
      index: "LAST",
    });
  });

  it("空消息列表使用安全索引", () => {
    expect(resolveChatFrameInitialTopMostItemIndex(0)).toBe(0);
  });
});

describe("resolveChatFrameSeenIndexFromBounds", () => {
  it("以判定线为准取最后一个已看见的消息", () => {
    expect(resolveChatFrameSeenIndexFromBounds([
      { index: 1, bottom: 120 },
      { index: 2, bottom: 220 },
      { index: 3, bottom: 340 },
    ], 240, 1)).toBe(2);
  });

  it("没有任何消息越过底部线时回退到首个消息", () => {
    expect(resolveChatFrameSeenIndexFromBounds([
      { index: 4, bottom: 420 },
      { index: 5, bottom: 520 },
    ], 380, 4)).toBe(4);
  });

  it("缺少边界信息时回退到 fallback", () => {
    expect(resolveChatFrameSeenIndexFromBounds([], Number.NaN, 7)).toBe(7);
  });
});
