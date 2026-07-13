import { describe, expect, it } from "vitest";

import { resolveRightDrawerWidth } from "./layout-constants";

describe("resolveRightDrawerWidth", () => {
  it("按当前窗口宽度限制右抽屉宽度", () => {
    expect(resolveRightDrawerWidth(400)).toBe(300);
    expect(resolveRightDrawerWidth(240)).toBe(192);
  });

  it("窗口尺寸无效时使用安全默认宽度", () => {
    expect(resolveRightDrawerWidth(0)).toBe(300);
    expect(resolveRightDrawerWidth(Number.NaN)).toBe(300);
  });
});
