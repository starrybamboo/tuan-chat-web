import { describe, expect, it } from "vitest";

import { TextEnhanceSyntax } from "./realtimeRendererTextEnhance";

describe("textEnhanceSyntax", () => {
  it("保留 WebGAL 文本增强块，并把 CSS 冒号转换为引擎兼容写法", () => {
    expect(TextEnhanceSyntax.processContent("状态：[不支持](style=color:#ff0000\\;)")).toBe(
      "状态：[不支持](style=color~#ff0000\\;)",
    );
  });

  it("不会把增强块里的分号和冒号替换成普通全角标点", () => {
    expect(TextEnhanceSyntax.processContent("[红字](style=color:#f00\\;background-color:#111\\;)：ok")).toBe(
      "[红字](style=color~#f00\\;background-color~#111\\;)：ok",
    );
  });

  it("把聊天 HTML span 富文本颜色翻译为 WebGAL 文本增强语法", () => {
    expect(TextEnhanceSyntax.processContent("状态：<span style=\"color:#ef4444\">不支持</span>")).toBe(
      "状态：[不支持](style=color~#ef4444\\;)",
    );
  });

  it("把 font color 富文本翻译为 WebGAL 文本增强语法", () => {
    expect(TextEnhanceSyntax.processContent("<font color=\"red\">失败</font>")).toBe(
      "[失败](style=color~red\\;)",
    );
  });
});
