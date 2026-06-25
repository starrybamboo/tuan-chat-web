import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MessageAnnotationsBar from "./messageAnnotationsBar";

describe("messageAnnotationsBar", () => {
  function normalizeMarkup(markup: string) {
    return markup.replaceAll(/\s+/g, " ");
  }

  it("普通模式下会隐藏仅联动模式可见的立绘位置标注", () => {
    const html = renderToStaticMarkup(createElement(MessageAnnotationsBar, {
      annotations: ["figure.pos.left", "figure.anim.ba-jump"],
      showNormalModeAnnotationsOnly: true,
    }));

    expect(html).toContain("跳跃");
    expect(html).not.toContain(">左<");
  });

  it("联动模式下会显示立绘位置标注", () => {
    const html = renderToStaticMarkup(createElement(MessageAnnotationsBar, {
      annotations: ["figure.pos.left", "sys:bgm"],
      showNormalModeAnnotationsOnly: false,
    }));

    expect(html).toContain("BGM");
    expect(html).toContain(">左<");
  });

  it("图标标注按正方形尺寸展示", () => {
    const html = renderToStaticMarkup(createElement(MessageAnnotationsBar, {
      annotations: ["figure.anim.ba-down"],
    }));
    const normalizedHtml = normalizeMarkup(html);

    expect(html).toContain("aria-label=\"下落\"");
    expect(html).not.toContain("title=\"下落\"");
    expect(normalizedHtml).toContain(" h-6 ");
    expect(normalizedHtml).toContain(" w-6 ");
    expect(html).not.toContain("min-w-[36px]");
  });
});
