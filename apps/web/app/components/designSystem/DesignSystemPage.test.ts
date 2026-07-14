import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

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
    expect(markup).toContain("保存更改");
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
