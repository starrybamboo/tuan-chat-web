import { describe, expect, it } from "vitest";

import { structuralListItemMotionProps } from "./listItemMotion";

describe("structuralListItemMotionProps", () => {
  it("允许列表项只补间位置，避免父容器改宽时缩放内容", () => {
    expect(structuralListItemMotionProps({ layout: "position" }).layout).toBe("position");
  });

  it("默认仍补间位置与尺寸", () => {
    expect(structuralListItemMotionProps().layout).toBe(true);
  });
});
