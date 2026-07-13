import { describe, expect, it } from "vitest";

import { buttonClassName, type ButtonVariant } from "./Button";

const BUTTON_VARIANT_CLASSES: Array<[ButtonVariant, string]> = [
  ["primary", "tc-button-primary"],
  ["outline", "tc-button-outline"],
  ["ghost", "tc-button-ghost"],
  ["success", "tc-button-success"],
  ["warning", "tc-button-warning"],
  ["error", "tc-button-error"],
  ["errorOutline", "tc-button-error-outline"],
];

describe("buttonClassName", () => {
  it.each(BUTTON_VARIANT_CLASSES)("将 %s 映射到项目按钮语义 class", (variant, expectedClassName) => {
    const className = buttonClassName({ variant });

    expect(className).toContain("tc-button");
    expect(className).toContain(expectedClassName);
    expect(className).not.toMatch(/(?:^|\s)btn(?:-|\s|$)/);
  });

  it("将四档历史尺寸归并为紧凑和默认两档", () => {
    expect(buttonClassName({ size: "xs" })).toContain("tc-button-compact");
    expect(buttonClassName({ size: "sm" })).toContain("tc-button-compact");
    expect(buttonClassName({ size: "md" })).toContain("tc-button-default");
    expect(buttonClassName({ size: "lg" })).toContain("tc-button-default");
  });

  it("保留方形、圆形和加载态 class", () => {
    expect(buttonClassName({ shape: "square" })).toContain("tc-button-square");
    expect(buttonClassName({ shape: "circle" })).toContain("tc-button-circle");
    expect(buttonClassName({ loading: true })).toContain("pointer-events-none");
  });
});
