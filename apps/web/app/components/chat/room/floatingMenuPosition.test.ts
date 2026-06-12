import { describe, expect, it } from "vitest";

import { clampFloatingMenuPosition, createFloatingMenuAnchorFromElement } from "./floatingMenuPosition";

describe("createFloatingMenuAnchorFromElement", () => {
  it("使用触发元素的右上角作为菜单锚点", () => {
    const anchor = createFloatingMenuAnchorFromElement({
      getBoundingClientRect: () => ({
        top: 24.2,
        right: 186.8,
      } as DOMRect),
    });

    expect(anchor).toEqual({ x: 187, y: 24 });
  });
});

describe("clampFloatingMenuPosition", () => {
  it("当菜单会溢出视口右下角时，会把位置钳制到可见范围内", () => {
    const position = clampFloatingMenuPosition(
      { x: 520, y: 360 },
      { width: 192, height: 180 },
      { width: 640, height: 480 },
    );

    expect(position).toEqual({ x: 440, y: 292 });
  });

  it("当菜单位置已经在安全范围内时，保持原始坐标", () => {
    const position = clampFloatingMenuPosition(
      { x: 120, y: 96 },
      { width: 160, height: 120 },
      { width: 640, height: 480 },
    );

    expect(position).toEqual({ x: 120, y: 96 });
  });
});
