import { useCallback, useState } from "react";

import type { ChatPageMainView } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta, SidebarLeafNode, SidebarTree } from "@/components/chat/room/sidebarTree";

import { getDefaultCreateInCategoryMode } from "@/components/chat/utils/createInCategoryMode";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

type UseChatPageCreateInCategoryParams = {
  activeSpaceId?: number | null;
  isKPInSpace: boolean;
  buildTreeBaseForWrite: (docMetas: MinimalDocMeta[]) => SidebarTree;
  appendNodeToCategory: (params: {
    tree: SidebarTree;
    categoryId: string;
    node: SidebarLeafNode;
  }) => SidebarTree;
  saveSidebarTree: (tree: SidebarTree) => void;
  requestCreateDocInCategory: (categoryId: string, titleOverride?: string) => Promise<void>;
  setActiveRoomId: (roomId: number | null) => void;
  setMainView: (view: ChatPageMainView) => void;
  spaceDocMetas: MinimalDocMeta[] | null;
};

type UseChatPageCreateInCategoryResult = {
  isCreateInCategoryOpen: boolean;
  closeCreateInCategory: () => void;
  createDocInSelectedCategory: () => Promise<void>;
  createDocTitle: string;
  createInCategoryMode: "room" | "doc";
  handleRoomCreated: (roomId?: number) => void;
  openCreateInCategory: (categoryId: string) => void;
  pendingCreateInCategoryId: string | null;
  setCreateDocTitle: (value: string) => void;
  setCreateInCategoryMode: (value: "room" | "doc") => void;
};

export default function useChatPageCreateInCategory({
  activeSpaceId,
  isKPInSpace,
  buildTreeBaseForWrite,
  appendNodeToCategory,
  saveSidebarTree,
  requestCreateDocInCategory,
  setActiveRoomId,
  setMainView,
  spaceDocMetas,
}: UseChatPageCreateInCategoryParams): UseChatPageCreateInCategoryResult {
  const [isCreateInCategoryOpen, setIsCreateInCategoryOpen] = useSearchParamsState<boolean>("createInCategoryPop", false);
  const [pendingCreateInCategoryId, setPendingCreateInCategoryId] = useState<string | null>(null);
  const [createInCategoryMode, setCreateInCategoryMode] = useState<"room" | "doc">("room");
  const [createDocTitle, setCreateDocTitle] = useState("未命名文档");

  const openCreateInCategory = useCallback((categoryId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setPendingCreateInCategoryId(categoryId);
    setCreateInCategoryMode(getDefaultCreateInCategoryMode({ categoryId, isKPInSpace }));
    setCreateDocTitle("未命名文档");
    setIsCreateInCategoryOpen(true);
  }, [activeSpaceId, isKPInSpace, setIsCreateInCategoryOpen]);

  const closeCreateInCategory = useCallback(() => {
    setIsCreateInCategoryOpen(false);
    setPendingCreateInCategoryId(null);
  }, [setIsCreateInCategoryOpen]);

  const createDocInSelectedCategory = useCallback(async () => {
    const categoryId = pendingCreateInCategoryId;
    if (!categoryId)
      return;
    if (!isKPInSpace)
      return;
    await requestCreateDocInCategory(categoryId, createDocTitle);
    closeCreateInCategory();
  }, [closeCreateInCategory, createDocTitle, isKPInSpace, pendingCreateInCategoryId, requestCreateDocInCategory]);

  const handleRoomCreated = useCallback((roomId?: number) => {
    const categoryId = pendingCreateInCategoryId;
    setPendingCreateInCategoryId(null);

    if (roomId) {
      setMainView("chat");
      setActiveRoomId(roomId);
    }

    if (roomId && categoryId && activeSpaceId && activeSpaceId > 0) {
      const base = buildTreeBaseForWrite(spaceDocMetas ?? []);
      const next = appendNodeToCategory({
        tree: base,
        categoryId,
        node: { nodeId: `room:${roomId}`, type: "room", targetId: roomId },
      });
      saveSidebarTree(next);
    }

    setIsCreateInCategoryOpen(false);
  }, [
    activeSpaceId,
    appendNodeToCategory,
    buildTreeBaseForWrite,
    pendingCreateInCategoryId,
    saveSidebarTree,
    setActiveRoomId,
    setIsCreateInCategoryOpen,
    setMainView,
    spaceDocMetas,
  ]);

  return {
    isCreateInCategoryOpen,
    closeCreateInCategory,
    createDocInSelectedCategory,
    createDocTitle,
    createInCategoryMode,
    handleRoomCreated,
    openCreateInCategory,
    pendingCreateInCategoryId,
    setCreateDocTitle,
    setCreateInCategoryMode,
  };
}
