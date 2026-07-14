import { describe, expect, it } from "vitest";

import { buildTopNavItems } from "@/components/topbanner/topNavItems";
import { DESIGN_SYSTEM_PATH } from "@/utils/devRouteAccess";

describe("buildTopNavItems", () => {
  it("为开发环境加入 Design System 专用 Tab", () => {
    const items = buildTopNavItems({
      lastChatPath: "/chat/private",
      canUseAiImage: true,
      canUseFeedback: true,
      canUseDesignSystem: true,
    });

    expect(items.map(item => item.label)).toEqual(["聊天", "角色", "AI生图", "反馈", "设计系统"]);
    expect(items.find(item => item.to === DESIGN_SYSTEM_PATH)).toMatchObject({
      label: "设计系统",
      to: "/design-system",
    });
  });

  it("常规环境保持基础导航集合", () => {
    const items = buildTopNavItems({
      lastChatPath: "/chat/42",
      canUseAiImage: false,
      canUseFeedback: false,
      canUseDesignSystem: false,
    });

    expect(items.map(item => item.label)).toEqual(["聊天", "角色"]);
    expect(items[0]).toMatchObject({ to: "/chat/42", activePathPrefix: "/chat" });
  });
});
