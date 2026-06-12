import { describe, expect, it } from "vitest";

import { countTextEnhanceVisibleLength, extractTextEnhanceVisibleText } from "./textEnhanceMetrics";
import { parseTextEnhanceCSSString, parseTextEnhanceSegments, visibleOffsetToTextEnhanceRawOffset } from "./textEnhanceSyntax";

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

  it("能把预览态可见偏移映射回原始语法偏移", () => {
    const raw = "A[红字](style=color:#f00)B";
    expect(visibleOffsetToTextEnhanceRawOffset(raw, 0)).toBe(0);
    expect(visibleOffsetToTextEnhanceRawOffset(raw, 1)).toBe(1);
    expect(visibleOffsetToTextEnhanceRawOffset(raw, 2)).toBe(2);
    expect(visibleOffsetToTextEnhanceRawOffset(raw, 3)).toBe(raw.indexOf("B"));
    expect(visibleOffsetToTextEnhanceRawOffset(raw, 4)).toBe(raw.length);
  });

  it("支持 CSS 函数括号和转义逗号，不会提前结束增强语法", () => {
    const raw = "[SYSTEM OVERRIDE](style=color:#00f5ff\\;text-shadow:0 0 8px #00f5ff\\,0 0 18px #7c3aed\\; style-alltext=font-size:115%\\;transform:skewX(-8deg)\\;padding:0 0.15em\\;)：正在[重写现实](style=color:#f8ff6a\\; style-alltext=font-size:125%\\;transform:rotate(-2deg)\\;display:inline-block\\;)";
    const segments = parseTextEnhanceSegments(raw);

    expect(extractTextEnhanceVisibleText(raw)).toBe("SYSTEM OVERRIDE：正在重写现实");
    expect(segments).toHaveLength(3);
    expect(segments[0].type).toBe("enhanced");
    expect(segments[0].params?.["style-alltext"]).toContain("transform:skewX(-8deg);padding:0 0.15em;");
    expect(parseTextEnhanceCSSString(segments[0].params?.style ?? "").textShadow).toBe("0 0 8px #00f5ff,0 0 18px #7c3aed");
    expect(segments[2].params?.["style-alltext"]).toContain("transform:rotate(-2deg);display:inline-block;");
  });
});
