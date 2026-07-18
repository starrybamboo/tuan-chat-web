import { describe, expect, it } from "vitest";

import {
  badgeClassName,
  countBadgeClassName,
  inlineAlertClassName,
  progressBarClassName,
  STATUS_APPEARANCES,
  STATUS_TONES,
} from "./StatusPrimitives";

describe("badgeClassName", () => {
  it("按语义色和密度生成状态标记", () => {
    const className = badgeClassName({ tone: "success", density: "default" });

    expect(className).toContain("tc-badge");
    expect(className).toContain("min-h-7 px-2.5 text-sm");
    expect(className).toContain("border-success/25 bg-success/10 text-success");
  });

  it("计数标记默认使用实心底色和语义内容色", () => {
    const className = countBadgeClassName({ tone: "error" });

    expect(className).toContain("bg-error");
    expect(className).toContain("text-error-content");
    expect(className).toContain("rounded-full");
    expect(className).not.toContain("bg-error/10");
  });

  it.each(STATUS_TONES)("为 %s 状态色生成完整的四档外观原语", (tone) => {
    for (const appearance of STATUS_APPEARANCES) {
      expect(badgeClassName({ tone, appearance })).toContain(`tc-badge-${appearance}`);
      expect(countBadgeClassName({ tone, appearance })).toContain(`tc-count-badge-${appearance}`);
      expect(inlineAlertClassName({ tone, appearance })).toContain(`tc-inline-alert-${appearance}`);
    }
  });

  it("镂空状态原语保持透明背景", () => {
    expect(countBadgeClassName({ tone: "warning", appearance: "outline" }))
      .toContain("border-warning/65 bg-transparent text-warning");
    expect(inlineAlertClassName({ tone: "error", appearance: "outline" }))
      .toContain("border-error/25 bg-transparent text-error");
  });

  it("明确区分实心、柔和、描边和幽灵外观", () => {
    expect(badgeClassName({ tone: "info", appearance: "solid" }))
      .toContain("border-info bg-info text-info-content");
    expect(badgeClassName({ tone: "info", appearance: "soft" }))
      .toContain("border-info/25 bg-info/10 text-info");
    expect(badgeClassName({ tone: "info", appearance: "outline" }))
      .toContain("border-info/25 bg-transparent text-info");
    expect(badgeClassName({ tone: "info", appearance: "ghost" }))
      .toContain("border-transparent bg-transparent text-info");
  });

  it("柔和中性色与按钮使用相同的填色层级", () => {
    const expectedSurface = "border-base-content/15 bg-base-content/10 text-base-content";

    expect(badgeClassName({ tone: "neutral", appearance: "soft" })).toContain(expectedSurface);
    expect(countBadgeClassName({ tone: "neutral", appearance: "soft" })).toContain(expectedSurface);
  });

  it("进度条使用项目原语和稳定状态色", () => {
    expect(progressBarClassName({ tone: "success" })).toBe("tc-progress text-success");
    expect(progressBarClassName({ tone: "warning", className: "h-2" }))
      .toBe("tc-progress text-warning h-2");
  });
});
