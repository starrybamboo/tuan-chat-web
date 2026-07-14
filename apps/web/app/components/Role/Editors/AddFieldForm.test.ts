import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AddFieldForm from "@/components/Role/Editors/AddFieldForm";

describe("AddFieldForm", () => {
  it("tile 新增动作使用统一复合外壳和加号图标", () => {
    const markup = renderToStaticMarkup(createElement(AddFieldForm, {
      onAddField: () => undefined,
      existingKeys: [],
      variant: "tile",
    }));

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="添加字段"');
    expect(markup).toContain("focus-within:ring-inset");
    expect(markup).toContain("focus-visible:ring-0");
    expect(markup).toContain("max-md:min-h-hit-default");
    expect(markup).not.toContain("✓");
  });
});
