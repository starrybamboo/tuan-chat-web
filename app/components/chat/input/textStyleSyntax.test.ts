import { describe, expect, it } from "vitest";

import { parseTextEnhanceParams } from "@/utils/textEnhanceSyntax";

import { buildTextStyleSyntax } from "./textStyleSyntax";

describe("textStyleSyntax", () => {
  it("颜色写入 style，斜体和字号写入 style-alltext，并转义 CSS 分号", () => {
    expect(buildTextStyleSyntax("文本", {
      color: "#66327C",
      fontSize: "80%",
      italic: true,
    })).toBe("[文本](style-alltext=font-style:italic\\;font-size:80%\\; style=color:#66327C\\;)");
  });

  it("只有 style-alltext 时补充 inherit color 以触发文本拓展语法", () => {
    expect(buildTextStyleSyntax("文本", {
      bold: true,
    })).toBe("[文本](style-alltext=font-weight:bold\\; style=color:inherit\\;)");
  });

  it("背景色写入 style，适合作为高亮入口直接应用", () => {
    expect(buildTextStyleSyntax("文本", {
      backgroundColor: "#FEF3C7",
    })).toBe("[文本](style=background-color:#FEF3C7\\;)");
  });

  it("保留带空格的 ruby 和 CSS 值", () => {
    const syntax = buildTextStyleSyntax("文本", {
      ruby: "wen ben",
      textShadow: "0 1px 2px #000000",
    });
    expect(syntax).toBe("[文本](style-alltext=text-shadow:0 1px 2px #000000\\; style=color:inherit\\; ruby=wen ben)");
    expect(parseTextEnhanceParams("style-alltext=text-shadow:0 1px 2px #000000\\; style=color:inherit\\; ruby=wen ben")).toEqual({
      "style-alltext": "text-shadow:0 1px 2px #000000;",
      "style": "color:inherit;",
      "ruby": "wen ben",
    });
  });
});
