import { useCallback } from "react";

import type { SidebarLeafNode, SidebarTree } from "./sidebarTree";

type UseRoomSidebarTreeActionsParams = {
  treeToRender: SidebarTree;
  normalizeAndSet: (next: SidebarTree, save: boolean) => void;
};

type UseRoomSidebarTreeActionsResult = {
  moveNode: (fromCategoryId: string, fromIndex: number, toCategoryId: string, insertIndex: number, save: boolean) => void;
  moveCategory: (fromIndex: number, insertIndex: number) => void;
  removeNode: (categoryId: string, index: number) => void;
  addNode: (categoryId: string, node: SidebarLeafNode) => void;
};

export default function useRoomSidebarTreeActions({
  treeToRender,
  normalizeAndSet,
}: UseRoomSidebarTreeActionsParams): UseRoomSidebarTreeActionsResult {
  const moveNode = useCallback((fromCategoryId: string, fromIndex: number, toCategoryId: string, insertIndex: number, save: boolean) => {
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const fromCat = next.categories.find(c => c.categoryId === fromCategoryId);
    const toCat = next.categories.find(c => c.categoryId === toCategoryId);
    if (!fromCat || !toCat)
      return;
    if (fromIndex < 0 || fromIndex >= fromCat.items.length)
      return;

    const [item] = fromCat.items.splice(fromIndex, 1);
    if (!item)
      return;
    toCat.items = Array.isArray(toCat.items) ? toCat.items : [];
    const insert = Math.max(0, Math.min(insertIndex, toCat.items.length));
    toCat.items.splice(insert, 0, item);
    normalizeAndSet(next, save);
  }, [normalizeAndSet, treeToRender]);

  const moveCategory = useCallback((fromIndex: number, insertIndex: number) => {
    const base = treeToRender;
    if (fromIndex < 0 || fromIndex >= base.categories.length)
      return;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const [item] = next.categories.splice(fromIndex, 1);
    if (!item)
      return;
    const insert = Math.max(0, Math.min(insertIndex, next.categories.length));
    next.categories.splice(insert, 0, item);
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

  const removeNode = useCallback((categoryId: string, index: number) => {
    const base = treeToRender;
    const cat = base.categories.find(c => c.categoryId === categoryId);
    if (!cat)
      return;
    if (index < 0 || index >= cat.items.length)
      return;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const nextCat = next.categories.find(c => c.categoryId === categoryId);
    if (!nextCat)
      return;
    nextCat.items.splice(index, 1);
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

  const addNode = useCallback((categoryId: string, node: SidebarLeafNode) => {
    const base = treeToRender;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const cat = next.categories.find(c => c.categoryId === categoryId);
    if (!cat)
      return;
    cat.items = Array.isArray(cat.items) ? cat.items : [];
    cat.items.push(node);
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

  return {
    moveNode,
    moveCategory,
    removeNode,
    addNode,
  };
}
