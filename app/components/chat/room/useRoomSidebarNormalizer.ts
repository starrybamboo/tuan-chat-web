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

    // 閺傚洦銆傜紓鎾崇摠閿涙碍濡?title/cover 閸愭瑥鍙?sidebarTree 閼哄倻鍋ｉ敍鍫熷瘮娑斿懎瀵查崚鏉挎倵缁旑垽绱氶敍宀冾唨妫ｆ牕鐫嗘导妯哄帥鐏炴洜銇氱紓鎾崇摠閿涘矁鈧奔绗夐弰顖滅搼瀵?meta/缂冩垹绮堕崝鐘烘祰閵?
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
