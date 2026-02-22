import { describe, expect, it } from "vitest";

import { countTextEnhanceVisibleLength, extractTextEnhanceVisibleText } from "./textEnhanceMetrics";

describe("textEnhanceMetrics", () => {
  it("普通文本保持不变", () => {
    expect(extractTextEnhanceVisibleText("支持消息的富文本渲染")).toBe("支持消息的富文本渲染");
    expect(countTextEnhanceVisibleLength("支持消息的富文本渲染")).toBe(10);
  });

  it("样式语法仅统计可见文本", () => {
    const raw = "支持消息的[富文本](style=color:#FF0000 style-alltext=font-style:italic\\;)渲染";
    expect(extractTextEnhanceVisibleText(raw)).toBe("支持消息的富文本渲染");
    expect(countTextEnhanceVisibleLength(raw)).toBe(10);
  });

  it("注音语法仅统计正文文本", () => {
    const raw = "日语：[笑顔](えがお)";
    expect(extractTextEnhanceVisibleText(raw)).toBe("日语：笑顔");
    expect(countTextEnhanceVisibleLength(raw)).toBe(5);
  });

  it("支持多个富文本片段", () => {
    const raw = "[甲](style=color:#f00)+[乙](ruby=yi)+[丙](style=color:#0f0)";
    expect(extractTextEnhanceVisibleText(raw)).toBe("甲+乙+丙");
    expect(countTextEnhanceVisibleLength(raw)).toBe(4);
  });

  it("英文与半角符号按 0.5 计数", () => {
    expect(countTextEnhanceVisibleLength("ABC!?")).toBe(2.5);
  });

  it("全角字符按 1 计数", () => {
    expect(countTextEnhanceVisibleLength("ＡＢＣ！")).toBe(4);
  });

  it("emoji 仍按可见字符计数", () => {
    expect(countTextEnhanceVisibleLength("A😀B")).toBe(2);
  });
});
