import { describe, expect, it } from "vitest";

import { resolveMessageActionMenuLayout } from "./messageActionMenuLayout";

const baseParams = {
  anchor: { bottom: 520, top: 440, x: 180 },
  horizontalMargin: 12,
  insetBottom: 20,
  insetTop: 24,
  menuHeight: 172,
  menuWidth: 316,
  pointerHalfWidth: 8,
  pointerInset: 12,
  verticalGap: 9,
  viewportHeight: 800,
  viewportWidth: 360,
};

describe("resolveMessageActionMenuLayout", () => {
  it("使用真实菜单高度放在消息上方", () => {
    const layout = resolveMessageActionMenuLayout(baseParams);

    expect(layout.placement).toBe("above");
    expect(layout.top).toBe(259);
  });

  it("上方空间不足时放在消息下方", () => {
    const layout = resolveMessageActionMenuLayout({
      ...baseParams,
      anchor: { bottom: 150, top: 80, x: 180 },
    });

    expect(layout.placement).toBe("below");
    expect(layout.top).toBe(159);
  });

  it("在屏幕边缘内收菜单和指针", () => {
    const layout = resolveMessageActionMenuLayout({
      ...baseParams,
      anchor: { bottom: 520, top: 440, x: 350 },
    });

    expect(layout.left).toBe(32);
    expect(layout.pointerLeft).toBe(288);
  });
});
