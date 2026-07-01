import type { Dispatch, SetStateAction } from "react";

import { useCallback } from "react";
import toast from "react-hot-toast";

import type { MinimalDocMeta, SidebarLeafNode, SidebarTree } from "@/components/chat/room/sidebarTree";

import { upsertSpaceDocMetaCacheEntry } from "@/components/chat/infra/doc/space/spaceDocMetaPersistence";
import { appendSidebarNodeToCategory, buildDefaultSidebarTree } from "@/components/chat/room/sidebarTree";
import { tuanchat } from "api/instance";

import type { Room } from "../../../../api";

type UseSpaceSidebarTreeActionsParams = {
  activeSpaceId?: number | null;
  rooms: Room[];
  sidebarTree: SidebarTree | null;
  isKPInSpace: boolean;
  docMetasFromSidebarTree: MinimalDocMeta[];
  spaceDocMetas: MinimalDocMeta[] | null;
  mergeDocMetas: (...sources: Array<MinimalDocMeta[] | null | undefined>) => MinimalDocMeta[];
  loadSpaceDocMetas: () => Promise<MinimalDocMeta[]>;
  setSpaceDocMetas: Dispatch<SetStateAction<MinimalDocMeta[] | null>>;
  saveSidebarTree: (tree: SidebarTree) => void;
  navigate: (to: string) => void;
};

export default function useSpaceSidebarTreeActions({
  activeSpaceId,
  rooms,
  sidebarTree,
  isKPInSpace,
  docMetasFromSidebarTree,
  spaceDocMetas,
  mergeDocMetas,
  loadSpaceDocMetas,
  setSpaceDocMetas,
  saveSidebarTree,
  navigate,
}: UseSpaceSidebarTreeActionsParams) {
  const buildTreeBaseForWrite = useCallback((docMetas: MinimalDocMeta[]): SidebarTree => {
    return sidebarTree ?? buildDefaultSidebarTree({
      roomsInSpace: rooms.filter(r => r.spaceId === activeSpaceId),
      docMetas,
      includeDocs: true,
    });
  }, [activeSpaceId, rooms, sidebarTree]);

  const appendNodeToCategory = useCallback((params: {
    tree: SidebarTree;
    categoryId: string;
    node: SidebarLeafNode;
  }): SidebarTree => appendSidebarNodeToCategory(params), []);

  const resetSidebarTreeToDefault = useCallback(async () => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    const docMetas = isKPInSpace
      ? mergeDocMetas(
          spaceDocMetas ?? [],
          docMetasFromSidebarTree,
          await loadSpaceDocMetas(),
        )
      : [];

    if (isKPInSpace) {
      setSpaceDocMetas(docMetas);
    }

    const defaultTree = buildDefaultSidebarTree({
      roomsInSpace: rooms.filter(r => r.spaceId === activeSpaceId),
      docMetas,
      includeDocs: isKPInSpace,
    });

    saveSidebarTree(defaultTree);
  }, [
    activeSpaceId,
    docMetasFromSidebarTree,
    isKPInSpace,
    loadSpaceDocMetas,
    mergeDocMetas,
    rooms,
    saveSidebarTree,
    setSpaceDocMetas,
    spaceDocMetas,
  ]);

  const requestCreateDocInCategory = useCallback(async (categoryId: string, titleOverride?: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    if (!isKPInSpace)
      return;
    const title = (titleOverride ?? "未命名文档").trim() || "未命名文档";
    let createdDocId: number | null = null;
    try {
      const resp = await tuanchat.spaceDocController.createDoc({
        spaceId: activeSpaceId,
        title,
      });
      const id = Number((resp as any)?.data?.docId);
      if (Number.isFinite(id) && id > 0) {
        createdDocId = id;
      }
    }
    catch (err) {
      console.error("[SpaceDoc] create failed", err);
    }

    if (!createdDocId) {
      toast.error("创建文档失败，请重试");
      return;
    }

    const docId = String(createdDocId);

    const baseDocMetas = mergeDocMetas(
      spaceDocMetas ?? [],
      docMetasFromSidebarTree,
      await loadSpaceDocMetas(),
    );
    const nextDocMetas = baseDocMetas.some(m => m.id === docId)
      ? baseDocMetas
      : [...baseDocMetas, { id: docId, title }];

    upsertSpaceDocMetaCacheEntry({ spaceId: activeSpaceId, docId, title });
    setSpaceDocMetas(nextDocMetas);

    const base = buildTreeBaseForWrite(nextDocMetas);
    const next = appendNodeToCategory({
      tree: base,
      categoryId,
      node: { nodeId: `doc:${docId}`, type: "doc", targetId: docId, fallbackTitle: title },
    });
    saveSidebarTree(next);

    navigate(`/chat/${activeSpaceId}/doc/${createdDocId}`);
  }, [
    activeSpaceId,
    appendNodeToCategory,
    buildTreeBaseForWrite,
    docMetasFromSidebarTree,
    isKPInSpace,
    loadSpaceDocMetas,
    mergeDocMetas,
    navigate,
    saveSidebarTree,
    setSpaceDocMetas,
    spaceDocMetas,
  ]);

  return {
    buildTreeBaseForWrite,
    appendNodeToCategory,
    resetSidebarTreeToDefault,
    requestCreateDocInCategory,
  };
}
