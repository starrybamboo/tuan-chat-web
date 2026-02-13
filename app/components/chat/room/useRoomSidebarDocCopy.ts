import type { DragEvent } from "react";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";

import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import { copyDocToSpaceDoc } from "@/components/chat/utils/docCopy";
import { getDocRefDragData, isDocRefDrag } from "@/components/chat/utils/docRef";

import type { MinimalDocMeta, SidebarTree } from "./sidebarTree";

type UseRoomSidebarDocCopyParams = {
  activeSpaceId: number | null;
  isSpaceOwner: boolean;
  treeToRender: SidebarTree;
  visibleDocMetas: MinimalDocMeta[];
  appendExtraDocMeta: (meta: MinimalDocMeta) => void;
  normalizeAndSet: (next: SidebarTree, save: boolean, options?: { docMetasOverride?: MinimalDocMeta[] }) => void;
  isDragging: boolean;
};

type DocCopyDropParams = {
  categoryId: string;
  docRef: DocRefDragPayload;
};

type UseRoomSidebarDocCopyResult = {
  docCopyDropCategoryId: string | null;
  handleDocCopyCategoryDragLeave: (categoryId: string) => void;
  handleDocCopyCategoryDragOver: (e: DragEvent, categoryId: string) => void;
  handleDocCopyCategoryDrop: (e: DragEvent, categoryId: string) => void;
  handleDocCopyDragOverCapture: (e: DragEvent) => void;
  handleDocCopyDropCapture: (e: DragEvent) => void;
};

export default function useRoomSidebarDocCopy({
  activeSpaceId,
  isSpaceOwner,
  treeToRender,
  visibleDocMetas,
  appendExtraDocMeta,
  normalizeAndSet,
  isDragging,
}: UseRoomSidebarDocCopyParams): UseRoomSidebarDocCopyResult {
  const [docCopyDropCategoryId, setDocCopyDropCategoryId] = useState<string | null>(null);

  const handleDropDocRefToCategory = useCallback(async ({ categoryId, docRef }: DocCopyDropParams) => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      toast.error("未选择空间");
      return;
    }
    if (!isSpaceOwner) {
      toast.error("仅KP可复制到空间侧边栏");
      return;
    }
    if (docRef.spaceId && docRef.spaceId !== activeSpaceId) {
      toast.error("不允许跨空间复制文档");
      return;
    }

    const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
    const key = parseDescriptionDocId(docRef.docId);
    if (!key) {
      toast.error("仅支持复制空间文档（描述文档/我的文档）");
      return;
    }

    const toastId = toast.loading("正在复制到空间侧边栏…");
    try {
      const res = await copyDocToSpaceDoc({
        spaceId: activeSpaceId,
        sourceDocId: docRef.docId,
        title: docRef.title,
        imageUrl: docRef.imageUrl,
      });

      const newMeta: MinimalDocMeta = {
        id: res.newDocId,
        title: res.title,
        ...(docRef.imageUrl ? { imageUrl: docRef.imageUrl } : {}),
      };
      appendExtraDocMeta(newMeta);

      const baseTree = treeToRender;
      const nextTree = JSON.parse(JSON.stringify(baseTree)) as SidebarTree;
      const cat = nextTree.categories.find(c => c.categoryId === categoryId) ?? nextTree.categories[0];
      if (!cat) {
        toast.error("侧边栏分类不存在", { id: toastId });
        return;
      }
      cat.items = Array.isArray(cat.items) ? cat.items : [];
      const nodeId = `doc:${res.newDocId}`;
      if (!cat.items.some(i => i?.nodeId === nodeId)) {
        cat.items.push({
          nodeId,
          type: "doc",
          targetId: res.newDocId,
          fallbackTitle: res.title,
          ...(docRef.imageUrl ? { fallbackImageUrl: docRef.imageUrl } : {}),
        });
      }

      const docMetasOverride = (() => {
        const map = new Map<string, MinimalDocMeta>();
        for (const m of [...visibleDocMetas, newMeta]) {
          const id = typeof m?.id === "string" ? m.id : "";
          if (!id)
            continue;
          if (!map.has(id)) {
            map.set(id, { ...m });
            continue;
          }
          const existing = map.get(id)!;
          if (!existing.title && m.title) {
            existing.title = m.title;
          }
          if (!existing.imageUrl && m.imageUrl) {
            existing.imageUrl = m.imageUrl;
          }
        }
        return [...map.values()];
      })();

      normalizeAndSet(nextTree, true, { docMetasOverride });
      toast.success("已复制到空间侧边栏", { id: toastId });
    }
    catch (err) {
      console.error("[DocCopy] drop copy failed", err);
      toast.error(err instanceof Error ? err.message : "复制失败", { id: toastId });
    }
  }, [activeSpaceId, appendExtraDocMeta, isSpaceOwner, normalizeAndSet, treeToRender, visibleDocMetas]);

  const handleDocCopyDragOverCapture = useCallback((e: DragEvent) => {
    if (isDragging)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    if (!isDocRefDrag(e.dataTransfer))
      return;

    e.preventDefault();
    e.dataTransfer.dropEffect = isSpaceOwner ? "copy" : "none";

    const targetEl = e.target as HTMLElement | null;
    const catEl = targetEl?.closest?.("[data-tc-sidebar-category]") as HTMLElement | null;
    const cid = catEl?.getAttribute?.("data-tc-sidebar-category") || "";
    if (cid && cid !== docCopyDropCategoryId) {
      setDocCopyDropCategoryId(cid);
    }
  }, [activeSpaceId, docCopyDropCategoryId, isDragging, isSpaceOwner]);

  const handleDocCopyDropCapture = useCallback((e: DragEvent) => {
    if (isDragging)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    if (!isDocRefDrag(e.dataTransfer))
      return;

    e.preventDefault();
    e.stopPropagation();

    const docRef = getDocRefDragData(e.dataTransfer);
    if (!docRef) {
      toast.error("未识别到文档拖拽数据，请从文档卡片空白处重新拖拽");
      return;
    }

    const targetEl = e.target as HTMLElement | null;
    const catEl = targetEl?.closest?.("[data-tc-sidebar-category]") as HTMLElement | null;
    const cid = catEl?.getAttribute?.("data-tc-sidebar-category") || "";
    const categoryId = cid || docCopyDropCategoryId || treeToRender.categories[0]?.categoryId || "cat:docs";
    setDocCopyDropCategoryId(null);
    void handleDropDocRefToCategory({ categoryId, docRef });
  }, [activeSpaceId, docCopyDropCategoryId, handleDropDocRefToCategory, isDragging, treeToRender]);

  const handleDocCopyCategoryDragOver = useCallback((e: DragEvent, categoryId: string) => {
    if (isDragging)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    e.preventDefault();
    if (!isDocRefDrag(e.dataTransfer)) {
      if (docCopyDropCategoryId === categoryId) {
        setDocCopyDropCategoryId(null);
      }
      return;
    }
    setDocCopyDropCategoryId(categoryId);
    e.dataTransfer.dropEffect = isSpaceOwner ? "copy" : "none";
  }, [activeSpaceId, docCopyDropCategoryId, isDragging, isSpaceOwner]);

  const handleDocCopyCategoryDragLeave = useCallback((categoryId: string) => {
    if (docCopyDropCategoryId === categoryId) {
      setDocCopyDropCategoryId(null);
    }
  }, [docCopyDropCategoryId]);

  const handleDocCopyCategoryDrop = useCallback((e: DragEvent, categoryId: string) => {
    if (isDragging)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setDocCopyDropCategoryId(null);
    e.preventDefault();
    e.stopPropagation();
    const docRef = getDocRefDragData(e.dataTransfer);
    if (!docRef) {
      if (isDocRefDrag(e.dataTransfer)) {
        toast.error("未识别到文档拖拽数据，请从文档卡片空白处重新拖拽");
      }
      return;
    }
    void handleDropDocRefToCategory({ categoryId, docRef });
  }, [activeSpaceId, handleDropDocRefToCategory, isDragging]);

  return {
    docCopyDropCategoryId,
    handleDocCopyCategoryDragLeave,
    handleDocCopyCategoryDragOver,
    handleDocCopyCategoryDrop,
    handleDocCopyDragOverCapture,
    handleDocCopyDropCapture,
  };
}
