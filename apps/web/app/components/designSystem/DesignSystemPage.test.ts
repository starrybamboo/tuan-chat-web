import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BUTTON_APPEARANCES,
  BUTTON_TONES,
} from "@/components/common/Button";
import {
  STATUS_APPEARANCES,
  STATUS_TONES,
} from "@/components/common/StatusPrimitives";
import {
  COLOR_TOKEN_GROUPS,
  DESIGN_SYSTEM_SECTIONS,
} from "@/components/designSystem/designSystemCatalog";
import { DesignSystemPage } from "@/components/designSystem/DesignSystemPage";

const LEGACY_DAISY_CLASS = /^(?:avatar|btn|checkbox|file-input|join|menu|modal|progress|radio|range|toggle)(?:-|$)/;

describe("DesignSystemPage", () => {
  it("呈现完整 token 分区与公共原语样本", () => {
    const markup = renderToStaticMarkup(createElement(DesignSystemPage));

    expect(markup).toContain('data-design-system-page="true"');
    expect(markup).not.toContain("data-theme=");
    expect(markup).not.toContain("预览主题");
    for (const section of DESIGN_SYSTEM_SECTIONS) {
      expect(markup).toContain(`id="${section.id}"`);
      expect(markup).toContain(`aria-labelledby="${section.id}-heading"`);
      expect(markup).toContain(`id="${section.id}-heading"`);
    }
    for (const group of COLOR_TOKEN_GROUPS) {
      for (const token of group.tokens) {
        expect(markup).toContain(token.variable);
      }
    }
    expect(markup).toContain("实心填色");
    expect(markup).toContain("柔和填色");
    expect(markup).toContain("镂空轮廓");
    expect(markup).toContain("幽灵低强调");
    expect(markup).toContain("强度用法");
    expect(markup).toContain("浮层通知");
    expect(markup).toContain("浮层通知 · 四档强度");
    expect(markup).toContain("结构化 Toast");
    expect(markup).toContain("问题帮助 Toast");
    for (const tone of BUTTON_TONES) {
      for (const appearance of BUTTON_APPEARANCES) {
        expect(markup).toContain(`tc-button-tone-${tone} tc-button-${appearance}`);
      }
    }
    for (const appearance of STATUS_APPEARANCES) {
      expect(markup).toContain(`tc-badge-${appearance}`);
      expect(markup).toContain(`tc-count-badge-${appearance}`);
      expect(markup).toContain(`tc-inline-alert-${appearance}`);
      for (const tone of STATUS_TONES) {
        expect(markup).toContain(`data-status-pair="${tone}-${appearance}"`);
      }
    }
    expect(markup).toContain("--color-accent → --color-success");
    expect(markup).toContain('type="range"');
    expect(markup).toContain("打开对话框");
  });

  it("只通过项目原语生成组件 class", () => {
    const markup = renderToStaticMarkup(createElement(DesignSystemPage));
    const classTokens = [...markup.matchAll(/class="([^"]*)"/g)]
      .flatMap(match => match[1].split(/\s+/))
      .filter(Boolean);

    expect(classTokens.filter(className => LEGACY_DAISY_CLASS.test(className))).toEqual([]);
  });
});
