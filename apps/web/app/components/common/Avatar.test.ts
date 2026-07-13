import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("使用项目头像原语并保留尺寸与形状", () => {
    const markup = renderToStaticMarkup(createElement(Avatar, {
      alt: "角色头像",
      rounded: false,
      size: 12,
      src: "/avatar.png",
    }));

    expect(markup).toContain("tc-avatar");
    expect(markup).toContain("w-12 h-12");
    expect(markup).toContain("rounded");
    expect(markup).not.toContain('class="avatar ');
  });
});
