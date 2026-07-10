import { useCallback } from "react";

import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";

import { normalizeSidebarTree } from "./sidebarTree";

type UseRoomSidebarNormalizerParams = {
  fallbackTextRooms: Room[];
  visibleDocMetas: MinimalDocMeta[];
  isSpaceOwner: boolean;
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

    if (save) {
      onSaveSidebarTree?.(normalized);
      return;
    }
    setLocalTree(normalized);
  }, [fallbackTextRooms, isSpaceOwner, onSaveSidebarTree, setLocalTree, visibleDocMetas]);

  return normalizeAndSet;
}
