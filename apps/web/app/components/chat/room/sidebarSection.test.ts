import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SidebarSection from "./sidebarSection";

function renderActionButtonClass(actionVisibility?: "always" | "hover") {
  const html = renderToStaticMarkup(SidebarSection({
    title: "我的线索",
    isExpanded: true,
    onToggleExpanded: () => {},
    actionTitle: "新建线索",
    onAction: () => {},
    ...(actionVisibility ? { actionVisibility } : {}),
    children: createElement("div", null, "内容"),
  }));
  const buttonTag = html.match(/<button(?=[^>]*aria-label="新建线索")[^>]*>/)?.[0];
  expect(buttonTag).toBeTruthy();
  return buttonTag?.match(/class="([^"]+)"/)?.[1] ?? "";
}

function renderToggleButtonClass() {
  const html = renderToStaticMarkup(SidebarSection({
    title: "我的线索",
    isExpanded: true,
    onToggleExpanded: () => {},
    children: createElement("div", null, "内容"),
  }));
  const buttonTag = html.match(/<button(?=[^>]*title="折叠")[^>]*>/)?.[0];
  expect(buttonTag).toBeTruthy();
  return buttonTag?.match(/class="([^"]+)"/)?.[1] ?? "";
}

describe("SidebarSection", () => {
  it("默认保持 action 按钮 hover 后显示", () => {
    const className = renderActionButtonClass();

    expect(className).toContain("opacity-0");
    expect(className).toContain("group-hover:opacity-100");
  });

  it("支持 action 按钮常态显示", () => {
    const className = renderActionButtonClass("always");

    expect(className).toContain("opacity-100");
    expect(className).not.toContain("opacity-0");
    expect(className).not.toContain("group-hover:opacity-100");
  });

  it("折叠图标按钮使用大于图标的命中区", () => {
    const className = renderToggleButtonClass();

    expect(className).toContain("size-7");
    expect(className).toContain("focus-visible:ring-2");
  });
});
