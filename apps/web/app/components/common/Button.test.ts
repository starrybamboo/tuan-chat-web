import { describe, expect, it } from "vitest";

import {
  BUTTON_APPEARANCES,
  BUTTON_TONES,
  buttonClassName,
  type ButtonVariant,
} from "./Button";

const BUTTON_VARIANT_CLASSES: Array<[ButtonVariant, string, string]> = [
  ["primary", "tc-button-tone-primary", "tc-button-solid"],
  ["outline", "tc-button-tone-neutral", "tc-button-outline"],
  ["ghost", "tc-button-tone-neutral", "tc-button-ghost"],
  ["success", "tc-button-tone-success", "tc-button-solid"],
  ["warning", "tc-button-tone-warning", "tc-button-solid"],
  ["error", "tc-button-tone-error", "tc-button-solid"],
  ["errorOutline", "tc-button-tone-error", "tc-button-outline"],
];

describe("buttonClassName", () => {
  it.each(BUTTON_VARIANT_CLASSES)("将旧版 %s 映射到颜色和外观 class", (variant, toneClass, appearanceClass) => {
    const className = buttonClassName({ variant });

    expect(className).toContain("tc-button");
    expect(className).toContain(toneClass);
    expect(className).toContain(appearanceClass);
    expect(className).not.toMatch(/(?:^|\s)btn(?:-|\s|$)/);
  });

  it.each(BUTTON_TONES)("支持 %s 颜色的四档强调强度", (tone) => {
    for (const appearance of BUTTON_APPEARANCES) {
      const className = buttonClassName({ tone, appearance });

      expect(className).toContain(`tc-button-tone-${tone}`);
      expect(className).toContain(`tc-button-${appearance}`);
    }
  });

  it("将四档外观声明为所有颜色的共享合约", () => {
    expect(BUTTON_APPEARANCES).toEqual(["solid", "soft", "outline", "ghost"]);
  });

  it("显式颜色与外观优先于旧版组合", () => {
    const className = buttonClassName({ variant: "error", tone: "success", appearance: "outline" });

    expect(className).toContain("tc-button-tone-success");
    expect(className).toContain("tc-button-outline");
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
