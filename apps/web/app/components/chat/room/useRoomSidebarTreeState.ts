import { useEffect, useMemo, useRef, useState } from "react";

import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";

import { findSidebarCategoryIdForTarget, normalizeSidebarTree } from "./sidebarTree";
import usePersistedSidebarExpandedState from "./usePersistedSidebarExpandedState";

type UseRoomSidebarTreeStateParams = {
  activeSpaceId: number | null;
  currentUserId?: number | null;
  canEdit: boolean;
  isDragging: boolean;
  sidebarTree?: SidebarTree | null;
  activeRoomId?: number | null;
  activeDocId?: string | null;
  fallbackTextRooms: Room[];
  visibleDocMetas: MinimalDocMeta[];
  includeDocs: boolean;
  autoExpandTriggerKey?: string | null;
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
  activeRoomId,
  activeDocId,
  fallbackTextRooms,
  visibleDocMetas,
  includeDocs,
  autoExpandTriggerKey,
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
    if (!isDragging) {
      queueMicrotask(() => setLocalTree(null));
      return;
    }
    queueMicrotask(() => setLocalTree((prev) => {
      if (isSameSidebarTree(prev, displayTree)) {
        return prev;
      }
      return displayTree;
    }));
  }, [canEdit, displayTree, isDragging]);

  const treeToRender = canEdit && isDragging ? (localTree ?? displayTree) : displayTree;
  const validCategoryKeys = useMemo(() => {
    return treeToRender.categories.map(category => category.categoryId);
  }, [treeToRender]);
  const {
    expandedByKey: expandedByCategoryId,
    setExpanded: setCategoryExpanded,
    toggleExpanded: toggleCategoryExpanded,
  } = usePersistedSidebarExpandedState({
    activeSpaceId,
    currentUserId,
    storageScope: "room-doc-tree",
    validKeys: validCategoryKeys,
  });
  const lastAutoExpandedActiveNodeRef = useRef<string | null>(null);
  const activeTarget = useMemo(() => {
    if (activeDocId) {
      return { key: `doc:${activeDocId}`, target: { type: "doc" as const, id: activeDocId } };
    }
    if (typeof activeRoomId === "number" && Number.isFinite(activeRoomId)) {
      return { key: `room:${activeRoomId}`, target: { type: "room" as const, id: activeRoomId } };
    }
    return null;
  }, [activeDocId, activeRoomId]);
  const activeCategoryId = useMemo(() => {
    if (!activeTarget) {
      return null;
    }
    return findSidebarCategoryIdForTarget(treeToRender, activeTarget.target);
  }, [activeTarget, treeToRender]);

  useEffect(() => {
    if (!autoExpandTriggerKey || !activeTarget) {
      lastAutoExpandedActiveNodeRef.current = null;
      return;
    }
    if (!expandedByCategoryId) {
      return;
    }

    if (!activeCategoryId) {
      return;
    }

    const autoExpandIdentity = `${autoExpandTriggerKey}:${activeCategoryId}:${activeTarget.key}`;
    if (lastAutoExpandedActiveNodeRef.current === autoExpandIdentity) {
      return;
    }
    lastAutoExpandedActiveNodeRef.current = autoExpandIdentity;

    if (!expandedByCategoryId[activeCategoryId]) {
      setCategoryExpanded(activeCategoryId, true);
    }
  }, [activeCategoryId, activeTarget, autoExpandTriggerKey, expandedByCategoryId, setCategoryExpanded]);

  return {
    treeToRender,
    setLocalTree,
    expandedByCategoryId,
    toggleCategoryExpanded,
  };
}
