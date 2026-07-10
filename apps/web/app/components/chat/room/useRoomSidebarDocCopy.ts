import type { DragEvent } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { useCallback, useState } from "react";

import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import { buildDocCardReferencePayload } from "@/components/chat/message/docCard/docCardMedia";
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
      appToast.error("未选择空间");
      return;
    }
    if (!isSpaceOwner) {
      appToast.error("仅主持可复制到空间侧边栏");
      return;
    }

    const sourceDocRoomId = docRef.roomId ?? Number(docRef.docId);
    if (!Number.isFinite(sourceDocRoomId) || sourceDocRoomId <= 0) {
      appToast.error("仅支持复制空间文档");
      return;
    }

    const toastId = appToast.loading("正在复制到空间侧边栏…");
    try {
      const cleanDocRef = buildDocCardReferencePayload({
        docId: String(sourceDocRoomId),
        ...(docRef.spaceId ? { spaceId: docRef.spaceId } : {}),
        title: docRef.title,
        imageFileId: docRef.imageFileId,
        originalImageFileId: docRef.originalImageFileId,
        imageMediaType: docRef.imageMediaType,
      });
      const res = await copyDocToSpaceDoc({
        spaceId: activeSpaceId,
        sourceDocId: String(sourceDocRoomId),
        sourceSpaceId: cleanDocRef.spaceId,
        title: cleanDocRef.title,
        imageFileId: cleanDocRef.imageFileId,
        originalImageFileId: cleanDocRef.originalImageFileId,
        imageMediaType: cleanDocRef.imageMediaType,
      });

      const newMeta: MinimalDocMeta = {
        id: res.newDocId,
        title: res.title,
        ...(cleanDocRef.imageFileId ? { imageFileId: cleanDocRef.imageFileId } : {}),
        ...(cleanDocRef.originalImageFileId ? { originalImageFileId: cleanDocRef.originalImageFileId } : {}),
        ...(cleanDocRef.imageMediaType ? { imageMediaType: cleanDocRef.imageMediaType } : {}),
      };
      appendExtraDocMeta(newMeta);

      const baseTree = treeToRender;
      const nextTree = JSON.parse(JSON.stringify(baseTree)) as SidebarTree;
      const cat = nextTree.categories.find(c => c.categoryId === categoryId) ?? nextTree.categories[0];
      if (!cat) {
        appToast.error("侧边栏分类不存在", { id: toastId });
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
          ...(cleanDocRef.imageFileId ? { fallbackImageFileId: cleanDocRef.imageFileId } : {}),
          ...(cleanDocRef.originalImageFileId ? { fallbackOriginalImageFileId: cleanDocRef.originalImageFileId } : {}),
          ...(cleanDocRef.imageMediaType ? { fallbackImageMediaType: cleanDocRef.imageMediaType } : {}),
        });
      }

      const docMetasOverride = (() => {
        const map = new Map<string, MinimalDocMeta>();
        for (const m of [...visibleDocMetas, newMeta]) {
          const id = typeof m?.id === "string" ? m.id : "";
          if (!id)
            continue;
          const coverFields = buildDocCardReferencePayload({
            docId: id,
            imageFileId: m.imageFileId,
            originalImageFileId: m.originalImageFileId,
            imageMediaType: m.imageMediaType,
          });
          if (!map.has(id)) {
            map.set(id, {
              id,
              ...(m.title ? { title: m.title } : {}),
              ...(coverFields.imageFileId ? { imageFileId: coverFields.imageFileId } : {}),
              ...(coverFields.originalImageFileId ? { originalImageFileId: coverFields.originalImageFileId } : {}),
              ...(coverFields.imageMediaType ? { imageMediaType: coverFields.imageMediaType } : {}),
            });
            continue;
          }
          const existing = map.get(id)!;
          if (!existing.title && m.title) {
            existing.title = m.title;
          }
          if (!existing.imageFileId && coverFields.imageFileId) {
            existing.imageFileId = coverFields.imageFileId;
          }
          if (!existing.originalImageFileId && coverFields.originalImageFileId) {
            existing.originalImageFileId = coverFields.originalImageFileId;
          }
          if (!existing.imageMediaType && coverFields.imageMediaType) {
            existing.imageMediaType = coverFields.imageMediaType;
          }
        }
        return [...map.values()];
      })();

      normalizeAndSet(nextTree, true, { docMetasOverride });
      appToast.success("已复制到空间侧边栏", { id: toastId });
    }
    catch (err) {
      console.error("[DocCopy] drop copy failed", err);
      appToast.error(err instanceof Error ? err.message : "复制失败", { id: toastId });
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
      appToast.error("未识别到文档拖拽数据，请从文档卡片空白处重新拖拽");
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
        appToast.error("未识别到文档拖拽数据，请从文档卡片空白处重新拖拽");
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
