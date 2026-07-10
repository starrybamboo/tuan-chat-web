import { describe, expect, it } from "vitest";

import { getChatSidebarActiveButtonClass } from "./chatSidebarActiveTone";

describe("getChatSidebarActiveButtonClass", () => {
  it("展开态使用信息色突出当前入口", () => {
    expect(getChatSidebarActiveButtonClass("default")).toBe("border-info/40 text-info");
  });

  it("折叠可点击态使用警告色提示可展开", () => {
    expect(getChatSidebarActiveButtonClass("collapsed")).toBe("text-warning");
  });
});
