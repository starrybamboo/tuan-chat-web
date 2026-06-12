import { describe, expect, it } from "vitest";

import { isInternalLink, resolveInternalRouteHref } from "./linkHandler";

describe("markdown linkHandler", () => {
  const origin = "https://tuan.chat";

  it("识别同源内部路由并归一为 TanStack Router 路径", () => {
    expect(isInternalLink("/chat/1/2", origin)).toBe(true);
    expect(resolveInternalRouteHref("/chat/1/2?tab=room#msg", origin)).toBe("/chat/1/2?tab=room#msg");
    expect(resolveInternalRouteHref("https://tuan.chat/profile/7?from=md", origin)).toBe("/profile/7?from=md");
  });

  it("锚点链接保留普通 anchor 滚动逻辑", () => {
    expect(isInternalLink("#section-1", origin)).toBe(true);
    expect(resolveInternalRouteHref("#section-1", origin)).toBeNull();
  });

  it("外部链接不归一为内部路由", () => {
    expect(isInternalLink("https://example.com/chat/1", origin)).toBe(false);
    expect(resolveInternalRouteHref("https://example.com/chat/1", origin)).toBeNull();
  });
});
