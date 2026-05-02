import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BlocksuiteMentionProfileCardView } from "../../../shared/components/BlockSuite/blocksuiteMentionProfilePopover";
import {
  buildBlocksuiteMentionPopoverPosition,
  getBlocksuiteMentionProfileHref,
} from "../../../shared/components/BlockSuite/blocksuiteMentionProfilePopover.shared";
import { buildBlocksuiteMentionAnchorRect } from "../shared/mentionAnchorRect";

describe("blocksuiteMentionProfilePopover", () => {
  it("会把 iframe foreign realm 的 frameElement 坐标换算到宿主视口", () => {
    const anchorRect = buildBlocksuiteMentionAnchorRect({
      target: {
        getBoundingClientRect: () => ({
          left: 320,
          top: 180,
          right: 380,
          bottom: 204,
          width: 60,
          height: 24,
        }),
      },
      frameElement: {
        getBoundingClientRect: () => ({
          left: 520,
          top: 96,
          right: 1480,
          bottom: 896,
          width: 960,
          height: 800,
        }),
      },
    });

    expect(anchorRect).toEqual({
      left: 840,
      top: 276,
      right: 900,
      bottom: 300,
      width: 60,
      height: 24,
    });
  });

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
        kind: "user",
        userId: "12",
        href: "/profile/12",
        user: {
          userId: 12,
          username: "Alice",
          avatarFileId: 12,
          description: "这是一个用户简介。",
          activeStatus: "1",
        },
        isLoading: false,
        isError: false,
      }),
    );

    expect(html).toContain("Alice");
    expect(html).toContain("提及用户");
    expect(html).toContain("查看完整资料");
    expect(html).not.toContain("<iframe");
  });

  it("角色卡片渲染不再包含 iframe", () => {
    const html = renderToStaticMarkup(
      createElement(BlocksuiteMentionProfileCardView, {
        kind: "role",
        roleId: "34",
        href: null,
        role: {
          roleId: 34,
          userId: 1,
          roleName: "艾拉",
          description: "调查员角色",
          avatarFileId: 34,
          type: 2,
        },
        isLoading: false,
        isError: false,
        onOpenRoleDetail: () => {},
      }),
    );

    expect(html).toContain("艾拉");
    expect(html).toContain("提及角色");
    expect(html).toContain("查看 NPC 详情");
    expect(html).not.toContain("/role/34");
    expect(html).not.toContain("<iframe");
  });

  it("会根据目标类型生成正确跳转链接", () => {
    expect(getBlocksuiteMentionProfileHref({ targetKind: "user", targetId: "12" })).toBe("/profile/12");
    expect(getBlocksuiteMentionProfileHref({ targetKind: "role", targetId: "34" })).toBeNull();
  });
});
