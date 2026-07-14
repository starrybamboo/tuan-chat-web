import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import EditableField from "@/components/Role/Editors/EditableField";

describe("EditableField", () => {
  it("编辑态共享单层焦点外壳并保留独立删除动作", () => {
    const markup = renderToStaticMarkup(createElement(EditableField, {
      fieldKey: "生命",
      value: "12",
      isEditing: true,
      onValueChange: () => undefined,
      onDelete: () => undefined,
      onRename: () => undefined,
      size: "compact",
    }));

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="编辑字段 生命"');
    expect(markup).toContain('aria-label="删除字段 生命"');
    expect(markup).toContain("focus-within:ring-inset");
    expect(markup).toContain("focus-visible:ring-0");
    expect(markup).toContain("max-md:min-h-hit-default");
  });
});
