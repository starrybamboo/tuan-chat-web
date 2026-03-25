import { useCallback, useState } from "react";
import toast from "react-hot-toast";

import { deleteSpaceDoc } from "@/components/chat/infra/blocksuite/space/deleteSpaceDoc";

import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";
import type { DeleteConfirmDocState } from "./sidebarTreeOverlays";

type UseRoomSidebarDeleteHandlersParams = {
  treeToRender: SidebarTree;
  normalizeAndSet: (next: SidebarTree, save: boolean) => void;
  activeSpaceId: number | null;
  removeNode: (categoryId: string, index: number) => void;
  docMetaMap: Map<string, MinimalDocMeta>;
  onDeleteDoc?: (docId: string) => void;
};

type UseRoomSidebarDeleteHandlersResult = {
  deleteConfirmCategoryId: string | null;
  deleteConfirmDoc: DeleteConfirmDocState | null;
  openDeleteConfirmCategory: (categoryId: string) => void;
  closeDeleteConfirmCategory: () => void;
  confirmDeleteCategory: (categoryId: string) => void;
  openDeleteConfirmDoc: (docId: string, title: string, categoryId: string, index: number) => void;
  closeDeleteConfirmDoc: () => void;
  confirmDeleteDoc: (payload: DeleteConfirmDocState) => void;
  getDocTitle: (docId: string) => string;
};

export default function useRoomSidebarDeleteHandlers({
  treeToRender,
  normalizeAndSet,
  activeSpaceId,
  removeNode,
  docMetaMap,
  onDeleteDoc,
}: UseRoomSidebarDeleteHandlersParams): UseRoomSidebarDeleteHandlersResult {
  const [deleteConfirmCategoryId, setDeleteConfirmCategoryId] = useState<string | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DeleteConfirmDocState | null>(null);

  const deleteCategoryCore = useCallback((categoryId: string) => {
    const base = treeToRender;
    const idx = base.categories.findIndex(c => c.categoryId === categoryId);
    if (idx === -1)
      return;
    if (base.categories.length <= 1)
      return;
    const next = JSON.parse(JSON.stringify(base)) as SidebarTree;
    const [removed] = next.categories.splice(idx, 1);
    if (!removed)
      return;
    const targetIdx = Math.max(0, Math.min(idx - 1, next.categories.length - 1));
    const target = next.categories[targetIdx];
    if (target) {
      target.items.push(...(removed.items ?? []));
    }
    normalizeAndSet(next, true);
  }, [normalizeAndSet, treeToRender]);

  const openDeleteConfirmCategory = useCallback((categoryId: string) => {
    setDeleteConfirmCategoryId(categoryId);
  }, []);

  const closeDeleteConfirmCategory = useCallback(() => {
    setDeleteConfirmCategoryId(null);
  }, []);

  const confirmDeleteCategory = useCallback((categoryId: string) => {
    deleteCategoryCore(categoryId);
    setDeleteConfirmCategoryId(null);
  }, [deleteCategoryCore]);

  const openDeleteConfirmDoc = useCallback((docId: string, title: string, categoryId: string, index: number) => {
    setDeleteConfirmDoc({ docId, title, categoryId, index });
  }, []);

  const closeDeleteConfirmDoc = useCallback(() => {
    setDeleteConfirmDoc(null);
  }, []);

  const confirmDeleteDoc = useCallback(async (payload: DeleteConfirmDocState) => {
    if (!activeSpaceId) {
      toast.error("未选择空间，无法删除文档");
      return;
    }

    try {
      await deleteSpaceDoc({ spaceId: activeSpaceId, docId: payload.docId });
    }
    catch (err) {
      console.error("[SidebarTree] deleteSpaceDoc failed", err);
      toast.error(err instanceof Error && err.message ? err.message : "删除文档失败，请重试");
      return;
    }

    removeNode(payload.categoryId, payload.index);
    onDeleteDoc?.(payload.docId);
    setDeleteConfirmDoc(null);
  }, [activeSpaceId, onDeleteDoc, removeNode]);

  const getDocTitle = useCallback((docId: string) => {
    return docMetaMap.get(docId)?.title ?? docId;
  }, [docMetaMap]);

  return {
    deleteConfirmCategoryId,
    deleteConfirmDoc,
    openDeleteConfirmCategory,
    closeDeleteConfirmCategory,
    confirmDeleteCategory,
    openDeleteConfirmDoc,
    closeDeleteConfirmDoc,
    confirmDeleteDoc,
    getDocTitle,
  };
}
