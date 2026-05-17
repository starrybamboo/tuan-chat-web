import { describe, expect, it } from "vitest";

import { extractEditablePlainText } from "./chatInputPlainText";

type TestNode = NonNullable<Parameters<typeof extractEditablePlainText>[0]>;

function text(value: string): TestNode {
  return {
    nodeType: 3,
    nodeName: "#text",
    textContent: value,
    childNodes: [],
  };
}

function element(
  nodeName: string,
  children: TestNode[] = [],
  dataset?: Record<string, string | undefined>,
): TestNode {
  return {
    nodeType: 1,
    nodeName: nodeName.toUpperCase(),
    textContent: null,
    childNodes: children,
    ...(dataset ? { dataset } : {}),
  };
}

describe("extractEditablePlainText", () => {
  it("会把 br 换回真实换行符", () => {
    const root = element("div", [
      text("第一行"),
      element("br"),
      text("第二行"),
    ]);

    expect(extractEditablePlainText(root)).toBe("第一行\n第二行");
  });

  it("会保留块级节点之间的空行", () => {
    const root = element("div", [
      element("div", [text("第一段")]),
      element("div", [element("br")]),
      element("div", [text("第二段")]),
    ]);

    expect(extractEditablePlainText(root)).toBe("第一段\n\n第二段");
  });

  it("按需移除提及节点文本", () => {
    const root = element("div", [
      text("你好 "),
      element("span", [text("@旁白")], { role: "{\"roleId\":1}" }),
      element("br"),
      text("第二行"),
    ]);

    expect(extractEditablePlainText(root)).toBe("你好 @旁白\n第二行");
    expect(extractEditablePlainText(root, { omitMentions: true })).toBe("你好 \n第二行");
  });

  it("会把不换行空格恢复成普通空格", () => {
    const root = element("div", [text("A\u00A0B")]);

    expect(extractEditablePlainText(root)).toBe("A B");
  });
});
