import { describe, expect, it } from "vitest";

import { COMBAT_VISUAL_OVERLAY_STYLE } from "./roomWindowLayout";

describe("roomWindowLayout", () => {
  it("战斗轮视觉滤镜使用淡黄色系且不叠加黄色背景", () => {
    const serializedStyle = [
      COMBAT_VISUAL_OVERLAY_STYLE.backgroundColor,
      COMBAT_VISUAL_OVERLAY_STYLE.backgroundImage,
      COMBAT_VISUAL_OVERLAY_STYLE.boxShadow,
    ].join(" ");

    expect(COMBAT_VISUAL_OVERLAY_STYLE.backgroundColor).toBe("transparent");
    expect(serializedStyle).toContain("250, 204, 21");
    expect(serializedStyle).toContain("234, 179, 8");
    expect(serializedStyle).toContain("0.08");
    expect(serializedStyle).not.toContain("127, 29, 29");
    expect(serializedStyle).not.toContain("180, 83, 9");
    expect(serializedStyle).not.toContain("245, 158, 11");
  });
});
