import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CHAT_LOCAL_DB_UNAVAILABLE_EVENT,
  consumeChatLocalDbUnavailableEvent,
  dispatchChatLocalDbUnavailableEvent,
} from "./localDbStatusEvents";

describe("localDbStatusEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("没有 window 时记录日志并缓存事件", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("window", undefined);
    const detail = {
      message: "unavailable",
      reason: "missing-opfs-api" as const,
      suggestion: "请使用现代浏览器打开 HTTPS 或 localhost 页面。",
    };

    expect(() => dispatchChatLocalDbUnavailableEvent(detail)).not.toThrow();

    expect(consoleWarn).toHaveBeenCalledWith("[ChatHistory] Local message cache unavailable.", detail);
    expect(consumeChatLocalDbUnavailableEvent()).toEqual(detail);
  });

  it("有 window 时派发全局事件并交给 toast 展示层记录日志", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    const detail = {
      message: "高性能本地 SQLite 初始化失败，已禁用本地消息缓存。",
      reason: "sqlite-wasm-worker-failed" as const,
      suggestion: "关闭其他标签页后刷新，或清理站点数据后重试。",
    };

    dispatchChatLocalDbUnavailableEvent(detail);

    expect(consoleWarn).not.toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0]?.[0] as CustomEvent;
    expect(event.type).toBe(CHAT_LOCAL_DB_UNAVAILABLE_EVENT);
    expect(event.detail).toEqual(detail);
    expect(consumeChatLocalDbUnavailableEvent()).toEqual(detail);
    expect(consumeChatLocalDbUnavailableEvent()).toBeNull();
  });
});
