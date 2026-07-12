import { describe, expect, it } from "vitest";

import { chatSidebarFocusClassName } from "./chatSidebarActiveTone";

describe("聊天侧栏按钮状态", () => {
  it("仅保留键盘焦点环，不绘制按钮选中层", () => {
    expect(chatSidebarFocusClassName).toContain("focus-visible:ring-2");
  });
});
