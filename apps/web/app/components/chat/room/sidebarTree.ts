export {
  appendSidebarNodeToCategory,
  applySidebarDocFallbackCache,
  buildDefaultSidebarTree,
  buildSidebarDocNode,
  buildSidebarRoomNode,
  collectExistingDocIds,
  collectExistingRoomIds,
  extractDocMetasFromSidebarTree,
  findSidebarCategoryIdForTarget,
  normalizeSidebarTree,
  parseSidebarTree,
} from "@tuanchat/domain/sidebar-tree";

export type {
  MinimalDocMeta,
  SidebarCategoryNode,
  SidebarLeafNode,
  SidebarTree,
} from "@tuanchat/domain/sidebar-tree";
