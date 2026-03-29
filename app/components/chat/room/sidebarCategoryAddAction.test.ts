import { describe, expect, it } from "vitest";
import { getSidebarCategoryAddAction, getSidebarCategoryAddTitle } from "./sidebarCategoryAddAction";
import { MATERIALS_CATEGORY_ID } from "./sidebarTree";

describe("sidebarCategoryAddAction", () => {
  it("素材包分类点击加号时走导入素材包", () => {
    expect(getSidebarCategoryAddAction(MATERIALS_CATEGORY_ID)).toBe("import-material-package");
    expect(getSidebarCategoryAddTitle(MATERIALS_CATEGORY_ID)).toBe("导入素材包");
  });

  it("其他分类点击加号时保持原有分类添加功能", () => {
    expect(getSidebarCategoryAddAction("cat:channels")).toBe("create-in-category");
    expect(getSidebarCategoryAddAction("cat:docs")).toBe("create-in-category");
    expect(getSidebarCategoryAddTitle("cat:channels")).toBe("添加");
  });
});
