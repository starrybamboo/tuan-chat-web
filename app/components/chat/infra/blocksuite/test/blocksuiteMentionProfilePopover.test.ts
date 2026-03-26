import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BlocksuiteMentionProfileCardView } from "../../../shared/components/BlockSuite/blocksuiteMentionProfilePopover";
import { buildBlocksuiteMentionPopoverPosition } from "../../../shared/components/BlockSuite/blocksuiteMentionProfilePopover.shared";

describe("blocksuiteMentionProfilePopover", () => {
  it("popover 定位会被限制在视口内部", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        innerWidth: 360,
        innerHeight: 320,
      },
    });

    const position = buildBlocksuiteMentionPopoverPosition({
      left: 330,
      top: 10,
      right: 340,
      bottom: 20,
      width: 10,
      height: 10,
    }, 420, 360);

    expect(position.left).toBeGreaterThanOrEqual(10);
    expect(position.top).toBeGreaterThanOrEqual(10);
    expect(position.width).toBeLessThanOrEqual(340);
    expect(position.height).toBeLessThanOrEqual(300);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });

  it("卡片渲染不再包含 iframe", () => {
    const html = renderToStaticMarkup(
      createElement(BlocksuiteMentionProfileCardView, {
        userId: "12",
        href: "/profile/12",
        user: {
          userId: 12,
          username: "Alice",
          avatar: "https://example.com/avatar.png",
          description: "这是一个用户简介。",
          activeStatus: "1",
        },
        isLoading: false,
        isError: false,
      }),
    );

    expect(html).toContain("Alice");
    expect(html).toContain("查看完整资料");
    expect(html).not.toContain("<iframe");
  });
});
