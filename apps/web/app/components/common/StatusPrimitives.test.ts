import { describe, expect, it } from "vitest";

import { badgeClassName, countBadgeClassName } from "./StatusPrimitives";

describe("badgeClassName", () => {
  it("按语义色和密度生成状态标记", () => {
    const className = badgeClassName({ tone: "success", density: "default" });

    expect(className).toContain("tc-badge");
    expect(className).toContain("min-h-7 px-2.5 text-sm");
    expect(className).toContain("border-success/25 bg-success/10 text-success");
  });

  it("计数标记使用实心底色和白色数字", () => {
    const className = countBadgeClassName({ tone: "error" });

    expect(className).toContain("bg-error");
    expect(className).toContain("text-white");
    expect(className).toContain("rounded-full");
    expect(className).not.toContain("bg-error/10");
  });

  it("支持描边和幽灵外观", () => {
    expect(badgeClassName({ tone: "info", appearance: "outline" }))
      .toContain("bg-transparent");
    expect(badgeClassName({ appearance: "ghost" }))
      .toContain("border-transparent bg-transparent");
  });
});
