import { describe, expect, it } from "vitest";

import { interactiveClassName, maskClassName, selectionClassName, surfaceClassName, textClassName } from "./DesignLanguage";

describe("DesignLanguage class helpers", () => {
  it("固定三层表面与嵌套面的语义类", () => {
    expect(surfaceClassName({ level: "canvas" })).toBe("tc-surface-canvas");
    expect(surfaceClassName({ level: "floating", className: "w-64" })).toBe("tc-surface-floating w-64");
  });

  it("固定文字角色并组合长文本规则", () => {
    expect(textClassName({ variant: "pageTitle", wrap: "balance" }))
      .toContain("text-page-title font-semibold text-base-content text-balance");
    expect(textClassName({ variant: "code" })).toContain("font-mono");
    expect(textClassName({ variant: "data" })).toContain("tabular-nums");
  });

  it("交互热区只提供紧凑和默认两档", () => {
    expect(interactiveClassName({ density: "compact" })).toContain("min-h-hit-compact");
    expect(interactiveClassName()).toContain("min-h-hit-default");
  });

  it("固定四档选中强度并允许追加布局类", () => {
    expect(selectionClassName({ level: "tone" })).toBe("text-info");
    expect(selectionClassName()).toBe("bg-info/10 text-info");
    expect(selectionClassName({ level: "strong" }))
      .toBe("bg-info/15 text-base-content ring-1 ring-inset ring-info/70 dark:bg-info/20");
    expect(selectionClassName({ level: "solid", className: "rounded-md" }))
      .toBe("bg-info text-info-content rounded-md");
  });

  it("统一头像裁切形状并允许追加尺寸类", () => {
    expect(maskClassName({ className: "size-8" })).toBe("mask mask-squircle size-8");
  });
});
