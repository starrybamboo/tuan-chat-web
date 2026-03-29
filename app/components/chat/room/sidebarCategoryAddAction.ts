import { MATERIALS_CATEGORY_ID } from "./sidebarTree";

export type SidebarCategoryAddAction = "create-in-category" | "import-material-package";

export function getSidebarCategoryAddAction(categoryId: string): SidebarCategoryAddAction {
  if (categoryId === MATERIALS_CATEGORY_ID) {
    return "import-material-package";
  }
  return "create-in-category";
}

export function getSidebarCategoryAddTitle(categoryId: string): string {
  if (getSidebarCategoryAddAction(categoryId) === "import-material-package") {
    return "导入素材包";
  }
  return "添加";
}
