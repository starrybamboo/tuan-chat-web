import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MessageAnnotationsBar from "./messageAnnotationsBar";

describe("messageAnnotationsBar", () => {
  it("普通模式下会隐藏仅联动模式可见的立绘位置标注", () => {
    const html = renderToStaticMarkup(createElement(MessageAnnotationsBar, {
      annotations: ["figure.pos.left", "sys:bgm"],
      showNormalModeAnnotationsOnly: true,
    }));

    expect(html).toContain("BGM");
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
});
