import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CHAT_STATUS_LABELS,
  normalizeChatStatusDescription,
  readChatStatusLabelsFromLocalStorage,
} from "./chatStatusLabels";

describe("chatStatusLabels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("使用新版输入和离开默认文案", () => {
    expect(DEFAULT_CHAT_STATUS_LABELS.input).toBe("正在输入");
    expect(DEFAULT_CHAT_STATUS_LABELS.leave).toBe("暂时离开");
  });

  it("读取本地状态文案时迁移旧版默认值", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => JSON.stringify({
          ...DEFAULT_CHAT_STATUS_LABELS,
          input: "输入中",
          leave: "暂离",
        })),
      },
    });

    expect(readChatStatusLabelsFromLocalStorage()).toMatchObject({
      input: "正在输入",
      leave: "暂时离开",
    });
  });

  it("接收旧版默认文案时统一为新文案", () => {
    expect(normalizeChatStatusDescription("input", "输入中")).toBe("正在输入");
    expect(normalizeChatStatusDescription("leave", "暂离")).toBe("暂时离开");
    expect(normalizeChatStatusDescription("leave", "去接水")).toBe("去接水");
  });
});
