import { useCallback } from "react";

import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";

import { applySidebarDocFallbackCache, normalizeSidebarTree } from "./sidebarTree";

type UseRoomSidebarNormalizerParams = {
  fallbackTextRooms: Room[];
  visibleDocMetas: MinimalDocMeta[];
  isSpaceOwner: boolean;
  docHeaderOverrides: Record<string, { title?: string; imageUrl?: string }>;
  docMetaMap: Map<string, MinimalDocMeta>;
  setLocalTree: (next: SidebarTree) => void;
  onSaveSidebarTree?: (tree: SidebarTree) => void;
};

type NormalizeAndSetOptions = {
  docMetasOverride?: MinimalDocMeta[];
};

export default function useRoomSidebarNormalizer({
  fallbackTextRooms,
  visibleDocMetas,
  isSpaceOwner,
  docHeaderOverrides,
  docMetaMap,
  setLocalTree,
  onSaveSidebarTree,
}: UseRoomSidebarNormalizerParams) {
  const normalizeAndSet = useCallback((next: SidebarTree, save: boolean, options?: NormalizeAndSetOptions) => {
    const normalized = normalizeSidebarTree({
      tree: next,
      roomsInSpace: fallbackTextRooms,
      docMetas: options?.docMetasOverride ?? visibleDocMetas,
      includeDocs: isSpaceOwner,
    });

    // 文档缓存：将 title/cover 写入 sidebarTree 节点（持久化到后端），让首屏优先展示缓存，而不是等 meta/网络加载。
    const normalizedWithCache = applySidebarDocFallbackCache({
      tree: normalized,
      docMetaMap,
      docHeaderOverrides,
    });

    setLocalTree(normalizedWithCache);
    if (save) {
      onSaveSidebarTree?.(normalizedWithCache);
    }
  }, [docHeaderOverrides, docMetaMap, fallbackTextRooms, isSpaceOwner, onSaveSidebarTree, setLocalTree, visibleDocMetas]);

  return normalizeAndSet;
}
