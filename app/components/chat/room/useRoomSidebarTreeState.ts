import { useEffect, useMemo, useState } from "react";

import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";

import { normalizeSidebarTree } from "./sidebarTree";
import usePersistedSidebarExpandedState from "./usePersistedSidebarExpandedState";

type UseRoomSidebarTreeStateParams = {
  activeSpaceId: number | null;
  currentUserId?: number | null;
  canEdit: boolean;
  isDragging: boolean;
  sidebarTree?: SidebarTree | null;
  fallbackTextRooms: Room[];
  visibleDocMetas: MinimalDocMeta[];
  includeDocs: boolean;
};

type UseRoomSidebarTreeStateResult = {
  treeToRender: SidebarTree;
  setLocalTree: (next: SidebarTree | null | ((prev: SidebarTree | null) => SidebarTree | null)) => void;
  expandedByCategoryId: Record<string, boolean> | null;
  toggleCategoryExpanded: (categoryId: string) => void;
};

function isSameSidebarTree(a: SidebarTree | null, b: SidebarTree | null): boolean {
  if (a === b)
    return true;
  if (!a || !b)
    return false;
  if (a.schemaVersion !== b.schemaVersion)
    return false;

  const aCats = a.categories ?? [];
  const bCats = b.categories ?? [];
  if (aCats.length !== bCats.length)
    return false;

  for (let i = 0; i < aCats.length; i++) {
    const ac = aCats[i];
    const bc = bCats[i];
    if (!ac || !bc)
      return false;
    if (ac.categoryId !== bc.categoryId || ac.name !== bc.name || Boolean(ac.collapsed) !== Boolean(bc.collapsed))
      return false;

    const aItems = ac.items ?? [];
    const bItems = bc.items ?? [];
    if (aItems.length !== bItems.length)
      return false;

    for (let j = 0; j < aItems.length; j++) {
      const ai = aItems[j];
      const bi = bItems[j];
      if (!ai || !bi)
        return false;
      if (
        ai.nodeId !== bi.nodeId
        || ai.type !== bi.type
        || ai.targetId !== bi.targetId
        || ai.fallbackTitle !== bi.fallbackTitle
        || ai.fallbackImageUrl !== bi.fallbackImageUrl
      ) {
        return false;
      }
    }
  }

  return true;
}

export default function useRoomSidebarTreeState({
  activeSpaceId,
  currentUserId,
  canEdit,
  isDragging,
  sidebarTree,
  fallbackTextRooms,
  visibleDocMetas,
  includeDocs,
}: UseRoomSidebarTreeStateParams): UseRoomSidebarTreeStateResult {
  const displayTree = useMemo(() => {
    return normalizeSidebarTree({
      tree: sidebarTree ?? null,
      roomsInSpace: fallbackTextRooms,
      docMetas: visibleDocMetas,
      includeDocs,
    });
  }, [fallbackTextRooms, includeDocs, sidebarTree, visibleDocMetas]);

  const [localTree, setLocalTree] = useState<SidebarTree | null>(null);

  useEffect(() => {
    if (!canEdit) {
      queueMicrotask(() => setLocalTree(null));
      return;
    }
    if (isDragging) {
      return;
    }
    queueMicrotask(() => setLocalTree((prev) => {
      if (isSameSidebarTree(prev, displayTree)) {
        return prev;
      }
      return displayTree;
    }));
  }, [canEdit, displayTree, isDragging]);

  const treeToRender = canEdit ? (localTree ?? displayTree) : displayTree;
  const validCategoryKeys = useMemo(() => {
    return treeToRender.categories.map(category => category.categoryId);
  }, [treeToRender]);
  const {
    expandedByKey: expandedByCategoryId,
    toggleExpanded: toggleCategoryExpanded,
  } = usePersistedSidebarExpandedState({
    activeSpaceId,
    currentUserId,
    storageScope: "room-doc-tree",
    validKeys: validCategoryKeys,
  });

  return {
    treeToRender,
    setLocalTree,
    expandedByCategoryId,
    toggleCategoryExpanded,
  };
}
