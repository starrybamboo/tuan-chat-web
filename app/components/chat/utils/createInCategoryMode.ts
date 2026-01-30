export type CreateInCategoryMode = "room" | "doc";

export function getDefaultCreateInCategoryMode(params: {
  categoryId: string;
  isKPInSpace: boolean;
}): CreateInCategoryMode {
  // 文档分类（cat:docs）里点击“创建”通常意图是新建文档：默认切到 doc
  if (params.isKPInSpace && params.categoryId === "cat:docs") {
    return "doc";
  }
  return "room";
}
