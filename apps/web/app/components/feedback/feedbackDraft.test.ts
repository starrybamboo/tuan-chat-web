import { afterEach, describe, expect, it, vi } from "vitest";

import { consumeFeedbackDraft, writeFeedbackDraft } from "@/components/feedback/feedbackDraft";

describe("feedbackDraft", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("把错误反馈草稿写入 sessionStorage，并在读取后清除", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });

    expect(writeFeedbackDraft({
      title: "页面报错",
      content: "已下载诊断日志",
      issueType: 1,
    })).toBe(true);

    expect(consumeFeedbackDraft()).toEqual({
      title: "页面报错",
      content: "已下载诊断日志",
      issueType: 1,
    });
    expect(consumeFeedbackDraft()).toBeNull();
  });

  it("忽略结构不完整的草稿", () => {
    const storage = new Map<string, string>([["tc:feedback:draft:v1", JSON.stringify({ title: "bad" })]]);
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });

    expect(consumeFeedbackDraft()).toBeNull();
    expect(storage.has("tc:feedback:draft:v1")).toBe(false);
  });
});
