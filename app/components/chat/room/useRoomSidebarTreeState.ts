import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSidebarTreeExpandedByCategoryId, setSidebarTreeExpandedByCategoryId } from "@/components/chat/infra/indexedDB/sidebarTreeUiDb";

import type { Room } from "../../../../api";
import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";

import { normalizeSidebarTree } from "./sidebarTree";

type UseRoomSidebarTreeStateParams = {
  activeSpaceId: number | null;
  currentUserId?: number | null;
  canEdit: boolean;
  isDragging: boolean;
  sidebarTree?: SidebarTree | null;
  fallbackTextRooms: Room[];
  visibleDocMetas: MinimalDocMeta[];
  isSpaceOwner: boolean;
};

type UseRoomSidebarTreeStateResult = {
  treeToRender: SidebarTree;
  setLocalTree: (next: SidebarTree | null | ((prev: SidebarTree | null) => SidebarTree | null)) => void;
  expandedByCategoryId: Record<string, boolean> | null;
  toggleCategoryExpanded: (categoryId: string) => void;
};

export default function useRoomSidebarTreeState({
  activeSpaceId,
  currentUserId,
  canEdit,
  isDragging,
  sidebarTree,
  fallbackTextRooms,
  visibleDocMetas,
  isSpaceOwner,
}: UseRoomSidebarTreeStateParams): UseRoomSidebarTreeStateResult {
  const displayTree = useMemo(() => {
    return normalizeSidebarTree({
      tree: sidebarTree ?? null,
      roomsInSpace: fallbackTextRooms,
      docMetas: visibleDocMetas,
      includeDocs: isSpaceOwner,
    });
  }, [fallbackTextRooms, isSpaceOwner, sidebarTree, visibleDocMetas]);

  const [localTree, setLocalTree] = useState<SidebarTree | null>(null);
  const [expandedByCategoryId, setExpandedByCategoryId] = useState<Record<string, boolean> | null>(null);
  const lastSpaceIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canEdit) {
      setLocalTree(null);
      return;
    }
    if (isDragging) {
      return;
    }
    setLocalTree(displayTree);
  }, [canEdit, displayTree, isDragging]);

  useEffect(() => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      setExpandedByCategoryId(null);
      lastSpaceIdRef.current = activeSpaceId;
      return;
    }

    if (activeSpaceId !== lastSpaceIdRef.current) {
      lastSpaceIdRef.current = activeSpaceId;
      setExpandedByCategoryId(null);
      getSidebarTreeExpandedByCategoryId({ userId: currentUserId, spaceId: activeSpaceId })
        .then((val) => {
          setExpandedByCategoryId(prev => prev ?? (val ?? {}));
        })
        .catch(() => {
          setExpandedByCategoryId({});
        });
    }
  }, [activeSpaceId, canEdit, currentUserId, displayTree]);

  useEffect(() => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      return;
    }
    if (!expandedByCategoryId) {
      return;
    }
    const next: Record<string, boolean> = {};
    const categoriesInView = (canEdit ? (localTree ?? displayTree) : displayTree).categories;
    for (const c of categoriesInView) {
      if (expandedByCategoryId[c.categoryId]) {
        next[c.categoryId] = true;
      }
    }
    const prevKeys = Object.keys(expandedByCategoryId).length;
    const nextKeys = Object.keys(next).length;
    if (prevKeys !== nextKeys) {
      setExpandedByCategoryId(next);
      setSidebarTreeExpandedByCategoryId({ userId: currentUserId, spaceId: activeSpaceId, expandedByCategoryId: next }).catch(() => {
        // ignore
      });
    }
  }, [activeSpaceId, canEdit, currentUserId, displayTree, expandedByCategoryId, localTree]);

  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      return;
    }
    setExpandedByCategoryId((prev) => {
      const base = prev ?? {};
      const next = { ...base, [categoryId]: !base[categoryId] };
      setSidebarTreeExpandedByCategoryId({ userId: currentUserId, spaceId: activeSpaceId, expandedByCategoryId: next }).catch(() => {
        // ignore
      });
      return next;
    });
  }, [activeSpaceId, currentUserId]);

  const treeToRender = canEdit ? (localTree ?? displayTree) : displayTree;

  return {
    treeToRender,
    setLocalTree,
    expandedByCategoryId,
    toggleCategoryExpanded,
  };
}
