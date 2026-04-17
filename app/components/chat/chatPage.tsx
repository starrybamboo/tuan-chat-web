import { useGetSpaceInfoQuery, useGetSpaceMembersQuery, useGetUserActiveSpacesQuery, useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import { useSpaceMaterialPackagesQuery } from "api/hooks/materialPackageQueryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useSearchParams } from "react-router";
import { ChatPageOverlays, ChatPagePanels } from "@/components/chat/chatPageContainers";
import { ChatPageLayoutProvider } from "@/components/chat/chatPageLayoutProvider";
import { ChatPageDocContent } from "@/components/chat/chatPageMainContent";
import ChatPageSubWindow from "@/components/chat/chatPageSubWindow";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatPageActiveSpaceInfo from "@/components/chat/hooks/useChatPageActiveSpaceInfo";
import useChatPageAutoNavigation from "@/components/chat/hooks/useChatPageAutoNavigation";
import useChatPageContextMenus from "@/components/chat/hooks/useChatPageContextMenus";
import useChatPageCreateInCategory from "@/components/chat/hooks/useChatPageCreateInCategory";
import useChatPageDetailPanels from "@/components/chat/hooks/useChatPageDetailPanels";
import useChatPageDocTitle from "@/components/chat/hooks/useChatPageDocTitle";
import useChatPageLeftDrawer from "@/components/chat/hooks/useChatPageLeftDrawer";
import useChatPageMemberActions from "@/components/chat/hooks/useChatPageMemberActions";
import useChatPageNavigation from "@/components/chat/hooks/useChatPageNavigation";
import useChatPageOrdering from "@/components/chat/hooks/useChatPageOrdering";
import useChatPageRoute from "@/components/chat/hooks/useChatPageRoute";
import useChatPageSidebarTree from "@/components/chat/hooks/useChatPageSidebarTree";
import useChatPageSpaceContext from "@/components/chat/hooks/useChatPageSpaceContext";
import useChatPageSpaceContextMenu from "@/components/chat/hooks/useChatPageSpaceContextMenu";
import useChatPageSpaceHandle from "@/components/chat/hooks/useChatPageSpaceHandle";
import useChatPageSubWindow from "@/components/chat/hooks/useChatPageSubWindow";
import useChatUnreadIndicators from "@/components/chat/hooks/useChatUnreadIndicators";
import useSpaceDocMetaState from "@/components/chat/hooks/useSpaceDocMetaState";
import useSpaceDocMetaSync from "@/components/chat/hooks/useSpaceDocMetaSync";
import useSpaceSidebarTreeActions from "@/components/chat/hooks/useSpaceSidebarTreeActions";
import useTutorialOnboarding from "@/components/chat/hooks/useTutorialOnboarding";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/space/spaceDocId";
import { extractDocMetasFromSidebarTree } from "@/components/chat/room/sidebarTree";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import TutorialUpdatePromptModal from "@/components/chat/tutorial/tutorialUpdatePromptModal";
import { checkIsKpInSpaceMembers, resolveSubWindowDocPermission } from "@/components/chat/utils/subWindowDocPermission";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";

const EMPTY_ARRAY: never[] = [];
interface CachedDocRoute {
  spaceId: number;
  docId: string;
}

/**
 * Chat 页面
 */
export default function ChatPage() {
  const {
    urlSpaceId,
    urlRoomId,
    activeSpaceId,
    isPrivateChatMode,
    isDocRoute,
    activeDocId,
    activeRoomId,
    targetMessageId,
    isRoomSettingRoute,
    spaceDetailRouteTab,
    isSpaceDetailRoute,
    navigate,
  } = useChatPageRoute();
  const [searchParam] = useSearchParams();
  const screenSize = useScreenSize();
  const {
    isOpenLeftDrawer,
    setIsOpenLeftDrawer,
    toggleLeftDrawer,
    closeLeftDrawer,
  } = useChatPageLeftDrawer({
    screenSize,
    isPrivateChatMode,
    urlSpaceId,
    urlRoomId,
  });

  useEffect(() => {
    useEntityHeaderOverrideStore.getState().hydrateFromLocalStorage();
    useDocHeaderOverrideStore.getState().hydrateFromLocalStorage();
  }, []);

  const chatLeftPanelWidth = useDrawerPreferenceStore(state => state.chatLeftPanelWidth);
  const setChatLeftPanelWidth = useDrawerPreferenceStore(state => state.setChatLeftPanelWidth);
  const {
    isOpen: isSubWindowOpen,
    width: subWindowWidth,
    tab: subWindowTab,
    roomId: subWindowRoomId,
    docId: subWindowDocId,
    threadRootMessageId: subWindowThreadRootMessageId,
    materialPackageId: subWindowMaterialPackageId,
    materialPathKey: subWindowMaterialPathKey,
    setIsOpen: setIsSubWindowOpen,
    setWidth: setSubWindowWidth,
    setTab: setSubWindowTab,
    setRoomId: setSubWindowRoomId,
    setDocId: setSubWindowDocId,
    setThreadRootMessageId: setSubWindowThreadRootMessageId,
    setMaterialSelection: setSubWindowMaterialSelection,
  } = useChatPageSubWindow({
    activeSpaceId,
    activeRoomId,
    activeDocId,
  });

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const [subWindowDocKpCache, setSubWindowDocKpCache] = useLocalStorage<Record<string, boolean>>("spaceSubWindowDocKpCache", {});
  const activeSpaceIdForQuery = activeSpaceId ?? -1;
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceIdForQuery);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceIdForQuery);
  const spaceMaterialPackagesRequest = useMemo(() => {
    return {
      pageNo: 1,
      pageSize: 100,
      spaceId: activeSpaceIdForQuery,
    };
  }, [activeSpaceIdForQuery]);
  const spaceMaterialPackagesQuery = useSpaceMaterialPackagesQuery(
    spaceMaterialPackagesRequest,
    activeSpaceIdForQuery > 0,
  );
  const rooms = userRoomQuery.data?.data?.rooms ?? EMPTY_ARRAY;
  const userSpacesQuery = useGetUserActiveSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? EMPTY_ARRAY;
  const activeSpaceInfoQuery = useGetSpaceInfoQuery(activeSpaceIdForQuery);
  const activeSpaceInfo = activeSpaceInfoQuery.data?.data;

  const globalContext = useGlobalContext();
  const userId = globalContext.userId ?? -1;
  const {
    tutorialUpdatePrompt,
    tutorialPromptType,
    isPullingTutorialUpdate,
    closeTutorialUpdatePrompt,
    confirmTutorialUpdatePull,
  } = useTutorialOnboarding({
    userId,
    enabled: !isPrivateChatMode,
    navigate,
  });
  const {
    orderedSpaces,
    orderedSpaceIds,
    orderedRooms,
    orderedRoomIds,
    setUserSpaceOrder,
    setUserRoomOrder,
    spaceRoomIdsByUser,
  } = useChatPageOrdering({
    userId,
    activeSpaceId,
    isPrivateChatMode,
    spaces,
    rooms,
  });
  const {
    activeSpace,
    activeSpaceAvatar,
    activeSpaceIsArchived,
    activeSpaceNameForUi,
  } = useChatPageActiveSpaceInfo({
    activeSpaceId,
    activeSpaceInfo,
    spaces,
  });
  const activeDocHeaderOverride = useDocHeaderOverrideStore(state => (activeDocId ? state.headers[activeDocId] : undefined));

  useSpaceDocMetaSync({
    spaceId: activeSpaceId,
    spaceName: activeSpace?.name,
    rooms,
  });

  const {
    sidebarTree,
    isSidebarTreeReady,
    saveSidebarTree: handleSaveSidebarTree,
  } = useChatPageSidebarTree({ activeSpaceId });
  const sidebarTreeRef = useRef(sidebarTree);
  const pendingDocFallbackByIdRef = useRef(new Map<string, { title: string; imageUrl: string }>());
  const docFallbackPersistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    sidebarTreeRef.current = sidebarTree;
  }, [sidebarTree]);

  const flushPendingDocFallbackToSidebarTree = useCallback(() => {
    const pendingEntries = [...pendingDocFallbackByIdRef.current.entries()];
    if (pendingEntries.length === 0) {
      return;
    }

    const tree = sidebarTreeRef.current;
    if (!tree) {
      return;
    }

    const nextTree = JSON.parse(JSON.stringify(tree));
    let changed = false;
    for (const [docId, header] of pendingEntries) {
      const title = String(header.title ?? "").trim();
      const imageUrl = String(header.imageUrl ?? "").trim();
      for (const category of nextTree.categories ?? []) {
        for (const item of category.items ?? []) {
          if (item?.type !== "doc") {
            continue;
          }
          if (String(item.targetId ?? "") !== docId) {
            continue;
          }
          if (title && String(item.fallbackTitle ?? "") !== title) {
            item.fallbackTitle = title;
            changed = true;
          }
          if (imageUrl) {
            if (String(item.fallbackImageUrl ?? "") !== imageUrl) {
              item.fallbackImageUrl = imageUrl;
              changed = true;
            }
          }
          else if (item.fallbackImageUrl) {
            delete item.fallbackImageUrl;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      handleSaveSidebarTree(nextTree);
    }
    pendingDocFallbackByIdRef.current.clear();
  }, [handleSaveSidebarTree]);

  const handleDocHeaderChangeForSidebarFallback = useCallback((payload: { docId: string; title: string; imageUrl: string }) => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      return;
    }
    const docId = String(payload.docId ?? "").trim();
    if (!docId) {
      return;
    }
    pendingDocFallbackByIdRef.current.set(docId, {
      title: String(payload.title ?? "").trim(),
      imageUrl: String(payload.imageUrl ?? "").trim(),
    });
    if (docFallbackPersistTimerRef.current != null) {
      window.clearTimeout(docFallbackPersistTimerRef.current);
    }
    docFallbackPersistTimerRef.current = window.setTimeout(() => {
      docFallbackPersistTimerRef.current = null;
      flushPendingDocFallbackToSidebarTree();
    }, 1000);
  }, [activeSpaceId, flushPendingDocFallbackToSidebarTree]);

  useEffect(() => {
    return () => {
      if (docFallbackPersistTimerRef.current != null) {
        window.clearTimeout(docFallbackPersistTimerRef.current);
      }
      docFallbackPersistTimerRef.current = null;
    };
  }, []);

  const sidebarTreeFirstRoomId = useMemo(() => {
    if (!sidebarTree) {
      return null;
    }
    const availableRoomIds = new Set<number>(
      orderedRooms
        .map(room => room.roomId)
        .filter((roomId): roomId is number => typeof roomId === "number" && Number.isFinite(roomId)),
    );
    for (const category of sidebarTree.categories ?? []) {
      for (const item of category.items ?? []) {
        if (item?.type !== "room") {
          continue;
        }
        const roomId = typeof item.targetId === "number"
          ? item.targetId
          : typeof item.targetId === "string"
            ? Number(item.targetId)
            : Number.NaN;
        if (!Number.isFinite(roomId)) {
          continue;
        }
        if (availableRoomIds.has(roomId)) {
          return roomId;
        }
      }
    }
    return null;
  }, [orderedRooms, sidebarTree]);

  const { setActiveSpaceId, setActiveRoomId, handleOpenPrivate } = useChatPageNavigation({
    activeSpaceId,
    isOpenLeftDrawer,
    navigate,
    screenSize,
    searchParam,
    setStoredChatIds,
  });

  const {
    roomSettingState,
    spaceDetailTab,
    openRoomSettingPage,
    closeRoomSettingPage,
    openSpaceDetailPanel,
    closeSpaceDetailPanel,
  } = useChatPageDetailPanels({
    activeRoomId,
    activeSpaceId,
    screenSize,
    isPrivateChatMode,
    isRoomSettingRoute,
    spaceDetailRouteTab,
    navigate,
    searchParam,
    storedIds,
  });
  const detailPanelMaterialPackageId = useMemo(() => {
    if (spaceDetailTab !== "material") {
      return null;
    }
    const raw = Number(searchParam.get("spacePackageId"));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [searchParam, spaceDetailTab]);
  const detailPanelMaterialPathKey = useMemo(() => {
    if (spaceDetailTab !== "material") {
      return null;
    }
    const normalized = searchParam.get("materialPathKey")?.trim() ?? "";
    return normalized || null;
  }, [searchParam, spaceDetailTab]);
  const activeMaterialSelection = useMemo(() => {
    if (spaceDetailTab === "material") {
      return {
        scope: "detail" as const,
        spacePackageId: detailPanelMaterialPackageId,
        materialPathKey: detailPanelMaterialPathKey,
      };
    }
    if (subWindowTab === "material") {
      return {
        scope: "subwindow" as const,
        spacePackageId: subWindowMaterialPackageId,
        materialPathKey: subWindowMaterialPathKey,
      };
    }
    return {
      scope: null,
      spacePackageId: null,
      materialPathKey: null,
    };
  }, [
    detailPanelMaterialPackageId,
    detailPanelMaterialPathKey,
    spaceDetailTab,
    subWindowMaterialPackageId,
    subWindowMaterialPathKey,
    subWindowTab,
  ]);
  const handleSelectRoom = useCallback((roomId: number) => {
    setActiveRoomId(roomId);
  }, [setActiveRoomId]);

  const handleSelectDoc = useCallback((docId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    const parsed = parseSpaceDocId(docId);
    if (parsed?.kind === "independent") {
      navigate(`/chat/${activeSpaceId}/doc/${parsed.docId}`);
      return;
    }
    navigate(`/chat/${activeSpaceId}/doc/${encodeURIComponent(docId)}`);
  }, [activeSpaceId, navigate]);

  const spaceMembers = spaceMembersQuery.data?.data ?? EMPTY_ARRAY;
  const isMemberPermissionResolved = spaceMembersQuery.isFetched;
  const isKPInSpace = useMemo(() => {
    return checkIsKpInSpaceMembers(spaceMembers, userId);
  }, [spaceMembers, userId]);
  const isSpaceOwnerInActiveSpace = useMemo(() => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return false;
    const ownerId = typeof activeSpace?.userId === "number" ? activeSpace.userId : Number.NaN;
    return Number.isFinite(ownerId) && ownerId === userId;
  }, [activeSpace?.userId, activeSpaceId, userId]);
  const cachedSubWindowDocKpPermission = useMemo(() => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return false;
    return subWindowDocKpCache[String(activeSpaceId)] === true;
  }, [activeSpaceId, subWindowDocKpCache]);
  // 刷新首屏阶段成员接口可能较慢；此时仅副窗口文档使用“上次已确认 KP”缓存做平滑回退，避免文档瞬时消失。
  const canViewSubWindowDoc = useMemo(() => {
    return resolveSubWindowDocPermission({
      isKpInMembers: isKPInSpace,
      isSpaceOwner: isSpaceOwnerInActiveSpace,
      isMemberPermissionResolved,
      cachedIsKp: cachedSubWindowDocKpPermission,
    });
  }, [cachedSubWindowDocKpPermission, isKPInSpace, isMemberPermissionResolved, isSpaceOwnerInActiveSpace]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0 || !isMemberPermissionResolved)
      return;
    const key = String(activeSpaceId);
    const nextCachedValue = isKPInSpace || isSpaceOwnerInActiveSpace;
    setSubWindowDocKpCache((prev) => {
      if ((prev[key] === true) === nextCachedValue) {
        return prev;
      }
      return { ...prev, [key]: nextCachedValue };
    });
  }, [activeSpaceId, isKPInSpace, isMemberPermissionResolved, isSpaceOwnerInActiveSpace, setSubWindowDocKpCache]);

  const docMetasFromSidebarTree = useMemo(() => {
    return extractDocMetasFromSidebarTree(sidebarTree).filter((m) => {
      const parsed = parseSpaceDocId(m.id);
      return parsed?.kind === "independent";
    });
  }, [sidebarTree]);

  const {
    spaceDocMetas,
    setSpaceDocMetas,
    mergeDocMetas,
    loadSpaceDocMetas,
    handleDocTcHeaderChange,
  } = useSpaceDocMetaState({
    activeSpaceId,
    canViewDocs: canViewSubWindowDoc,
    docMetasFromSidebarTree,
    isSidebarTreeReady,
    onDocHeaderChange: handleDocHeaderChangeForSidebarFallback,
  });
  const spaceDocMetasList = spaceDocMetas ?? EMPTY_ARRAY;

  const activeDocTitleForTcHeader = useChatPageDocTitle({
    activeDocId,
    activeDocHeaderOverride,
    docMetasFromSidebarTree,
    spaceDocMetas,
  });
  const [cachedDocRoute, setCachedDocRoute] = useState<CachedDocRoute | null>(null);

  useEffect(() => {
    if (!isDocRoute || !activeSpaceId || activeSpaceId <= 0 || !activeDocId) {
      return;
    }
    setCachedDocRoute((prev) => {
      if (prev?.spaceId === activeSpaceId && prev.docId === activeDocId) {
        return prev;
      }
      return { spaceId: activeSpaceId, docId: activeDocId };
    });
  }, [activeDocId, activeSpaceId, isDocRoute]);

  useEffect(() => {
    if (isDocRoute) {
      return;
    }
    setCachedDocRoute(null);
  }, [isDocRoute]);

  const docRouteForRender = useMemo<CachedDocRoute | null>(() => {
    if (isDocRoute && activeSpaceId && activeSpaceId > 0 && activeDocId) {
      return { spaceId: activeSpaceId, docId: activeDocId };
    }
    return cachedDocRoute;
  }, [activeDocId, activeSpaceId, cachedDocRoute, isDocRoute]);

  const handleDeleteDoc = useCallback((deletedDocId: string) => {
    const normalizedDeletedDocId = String(deletedDocId ?? "").trim();
    if (!normalizedDeletedDocId) {
      return;
    }

    setSpaceDocMetas((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return prev;
      }
      const next = prev.filter(meta => meta.id !== normalizedDeletedDocId);
      return next.length === prev.length ? prev : next;
    });

    setCachedDocRoute((prev) => {
      if (!prev) {
        return prev;
      }
      if (prev.docId !== normalizedDeletedDocId) {
        return prev;
      }
      return null;
    });

    if (subWindowDocId === normalizedDeletedDocId) {
      setSubWindowDocId(null);
    }

    if (!isDocRoute || activeDocId !== normalizedDeletedDocId) {
      return;
    }
    if (!activeSpaceId || activeSpaceId <= 0) {
      return;
    }

    navigate(`/chat/${activeSpaceId}`, { replace: true });
  }, [activeDocId, activeSpaceId, isDocRoute, navigate, setSpaceDocMetas, setSubWindowDocId, subWindowDocId]);

  const {
    buildTreeBaseForWrite,
    appendNodeToCategory,
    resetSidebarTreeToDefault,
    requestCreateDocInCategory,
  } = useSpaceSidebarTreeActions({
    activeSpaceId,
    rooms,
    sidebarTree,
    isKPInSpace,
    docMetasFromSidebarTree,
    spaceDocMetas,
    mergeDocMetas,
    loadSpaceDocMetas,
    setSpaceDocMetas,
    saveSidebarTree: handleSaveSidebarTree,
    navigate,
  });

  useChatPageAutoNavigation({
    activeSpaceId,
    isDocRoute,
    isPrivateChatMode,
    isSidebarTreeReady,
    isUserSpacesFetched: userSpacesQuery.isFetched,
    spaces,
    sidebarTreeFirstRoomId,
    orderedRooms,
    rooms,
    setActiveRoomId,
    setActiveSpaceId,
    storedIds,
    urlRoomId,
  });

  const { isSpaceHandleOpen, openSpaceHandle, setIsSpaceHandleOpen } = useChatPageSpaceHandle();
  const {
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
  } = useChatPageCreateInCategory({
    activeSpaceId,
    isKPInSpace,
    buildTreeBaseForWrite,
    appendNodeToCategory,
    saveSidebarTree: handleSaveSidebarTree,
    requestCreateDocInCategory,
    setActiveRoomId,
    spaceDocMetas,
  });

  useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

  const { unreadMessagesNumber, privateEntryBadgeCount } = useChatUnreadIndicators({
    globalContext,
    userId,
    isPrivateChatMode,
    activeRoomId,
    urlRoomId,
  });

  const {
    contextMenu,
    spaceContextMenu,
    handleContextMenu,
    closeContextMenu,
    closeSpaceContextMenu,
  } = useChatPageContextMenus();
  const { isSpaceContextArchived, isSpaceContextOwner } = useChatPageSpaceContextMenu({
    currentUserId: globalContext.userId,
    spaceContextMenu,
    spaces,
  });

  const { getSpaceUnreadMessagesNumber, isSpaceOwner, spaceContext } = useChatPageSpaceContext({
    activeRoomId,
    activeSpaceId,
    globalUserId: globalContext.userId,
    setActiveRoomId,
    setActiveSpaceId,
    spaces,
    spaceMembers,
    spaceRoomIdsByUser,
    toggleLeftDrawer,
    unreadMessagesNumber,
    userId,
  });

  const {
    handleAddRoomMember,
    handleAddSpaceMember,
    handleAddSpacePlayer,
    handleInvitePlayer,
    inviteRoomId,
    isMemberHandleOpen,
    setInviteRoomId,
    setIsMemberHandleOpen,
  } = useChatPageMemberActions({
    activeSpaceId,
    spaceMembers,
  });

  const layoutContextValue = useMemo(() => {
    return {
      isPrivateChatMode,
      activeSpaceId,
      activeRoomId,
      activeDocId,
      targetMessageId,
      setIsOpenLeftDrawer,
      isSpaceDetailRoute,
      spaceDetailTab,
      closeSpaceDetailPanel,
      roomSettingState,
      closeRoomSettingPage,
      isKPInSpace,
      activeDocTitleForTcHeader,
      onDocTcHeaderChange: handleDocTcHeaderChange,
    };
  }, [
    activeDocId,
    activeDocTitleForTcHeader,
    activeRoomId,
    activeSpaceId,
    closeRoomSettingPage,
    closeSpaceDetailPanel,
    handleDocTcHeaderChange,
    isKPInSpace,
    isPrivateChatMode,
    isSpaceDetailRoute,
    roomSettingState,
    setIsOpenLeftDrawer,
    spaceDetailTab,
    targetMessageId,
  ]);
  const sidePanelProps = {
    isPrivateChatMode,
    onCloseLeftDrawer: closeLeftDrawer,
    onToggleLeftDrawer: toggleLeftDrawer,
    isLeftDrawerOpen: isOpenLeftDrawer,
    currentUserId: userId,
    activeSpaceId,
    activeSpaceName: activeSpaceNameForUi,
    activeSpaceIsArchived,
    isSpaceOwner,
    isKPInSpace,
    canViewDocs: canViewSubWindowDoc,
    rooms: orderedRooms,
    roomOrderIds: orderedRoomIds,
    onReorderRoomIds: setUserRoomOrder,
    sidebarTree,
    onSaveSidebarTree: handleSaveSidebarTree,
    onResetSidebarTreeToDefault: resetSidebarTreeToDefault,
    docMetas: spaceDocMetasList,
    materialPackages: spaceMaterialPackagesQuery.isFetched
      ? (spaceMaterialPackagesQuery.data?.data?.list ?? [])
      : undefined,
    onSelectDoc: handleSelectDoc,
    onDeleteDoc: handleDeleteDoc,
    activeRoomId,
    activeDocId,
    activeMaterialSelection,
    unreadMessagesNumber,
    onContextMenu: handleContextMenu,
    onInviteMember: () => setIsMemberHandleOpen(true),
    onOpenSpaceDetailPanel: openSpaceDetailPanel,
    onSelectRoom: handleSelectRoom,
    onOpenRoomSetting: openRoomSettingPage,
    setIsOpenLeftDrawer,
    onOpenCreateInCategory: openCreateInCategory,
  };
  const spaceSidebarProps = {
    isPrivateChatMode,
    spaces: orderedSpaces,
    spaceOrderIds: orderedSpaceIds,
    onReorderSpaceIds: setUserSpaceOrder,
    activeSpaceId,
    getSpaceUnreadMessagesNumber,
    privateUnreadMessagesNumber: privateEntryBadgeCount,
    onOpenPrivate: handleOpenPrivate,
    onToggleLeftDrawer: toggleLeftDrawer,
    isLeftDrawerOpen: isOpenLeftDrawer,
    onSelectSpace: setActiveSpaceId,
    onCreateSpace: openSpaceHandle,
  };
  const leftDrawerToggleLabel = isOpenLeftDrawer ? "收起侧边栏" : "展开侧边栏";
  const hasMainContentDrawerToggle = isPrivateChatMode
    || (!isDocRoute && !isRoomSettingRoute && !isSpaceDetailRoute && Boolean(activeSpaceId) && activeRoomId != null);
  const shouldShowLeftDrawerToggle = screenSize === "sm" && !isOpenLeftDrawer && !hasMainContentDrawerToggle;
  const layoutProps = {
    screenSize,
    isOpenLeftDrawer,
    shouldShowLeftDrawerToggle,
    leftDrawerToggleLabel,
    toggleLeftDrawer,
    chatLeftPanelWidth,
    setChatLeftPanelWidth,
  };
  const modalsProps = {
    isSpaceHandleOpen,
    setIsSpaceHandleOpen,
    isCreateInCategoryOpen,
    closeCreateInCategory,
    createInCategoryMode,
    setCreateInCategoryMode,
    isKPInSpace,
    createDocTitle,
    setCreateDocTitle,
    pendingCreateInCategoryId,
    createDocInSelectedCategory,
    activeSpaceId,
    activeSpaceAvatar,
    onRoomCreated: handleRoomCreated,
    inviteRoomId,
    setInviteRoomId,
    onAddRoomMember: handleAddRoomMember,
    isMemberHandleOpen,
    setIsMemberHandleOpen,
    onAddSpaceMember: handleAddSpaceMember,
    onAddSpacePlayer: handleAddSpacePlayer,
  };
  const contextMenuProps = {
    contextMenu,
    unreadMessagesNumber,
    activeRoomId,
    onClose: closeContextMenu,
    onInvitePlayer: handleInvitePlayer,
    onOpenRoomSetting: openRoomSettingPage,
  };
  const spaceContextMenuProps = {
    contextMenu: spaceContextMenu,
    isSpaceOwner: isSpaceContextOwner,
    isArchived: isSpaceContextArchived,
    onClose: closeSpaceContextMenu,
  };
  const mainContent = (
    <div className="relative w-full h-full min-h-0 min-w-0">
      {!isDocRoute && <Outlet />}
      {docRouteForRender && (
        // 仅在文档路由下渲染文档编辑器；离开文档页后及时卸载，避免后台继续同步已关闭/已删除文档。
        <div className={isDocRoute ? "w-full h-full" : "hidden"} aria-hidden={!isDocRoute}>
          <ChatPageDocContent
            spaceId={docRouteForRender.spaceId}
            docId={docRouteForRender.docId}
            canViewDocs={canViewSubWindowDoc}
            tcHeaderTitle={activeDocTitleForTcHeader}
          />
        </div>
      )}
      {isDocRoute && !docRouteForRender && (
        <ChatPageDocContent canViewDocs={canViewSubWindowDoc} />
      )}
    </div>
  );

  return (
    <SpaceContext value={spaceContext}>
      <ChatPageLayoutProvider value={layoutContextValue}>
        <ChatPagePanels
          layoutProps={layoutProps}
          mainContent={mainContent}
          subWindowContent={(
            <ChatPageSubWindow
              screenSize={screenSize}
              activeSpaceId={activeSpaceId}
              isKPInSpace={canViewSubWindowDoc}
              isKPPermissionPending={!isMemberPermissionResolved}
              rooms={orderedRooms}
              docMetas={spaceDocMetasList}
              isOpen={isSubWindowOpen}
              width={subWindowWidth}
              tab={subWindowTab}
              roomId={subWindowRoomId}
              docId={subWindowDocId}
              threadRootMessageId={subWindowThreadRootMessageId}
              materialPackageId={subWindowMaterialPackageId}
              materialPathKey={subWindowMaterialPathKey}
              setIsOpen={setIsSubWindowOpen}
              setWidth={setSubWindowWidth}
              setTab={setSubWindowTab}
              setRoomId={setSubWindowRoomId}
              setDocId={setSubWindowDocId}
              setThreadRootMessageId={setSubWindowThreadRootMessageId}
              setMaterialSelection={setSubWindowMaterialSelection}
            />
          )}
          sidePanelProps={sidePanelProps}
          spaceSidebarProps={spaceSidebarProps}
        />
        <ChatPageOverlays
          modalsProps={modalsProps}
          contextMenuProps={contextMenuProps}
          spaceContextMenuProps={spaceContextMenuProps}
        />
        <TutorialUpdatePromptModal
          open={!isPrivateChatMode && Boolean(tutorialUpdatePrompt)}
          mode={tutorialPromptType}
          latestCommitId={tutorialUpdatePrompt?.latestCommitId}
          currentCommitId={tutorialUpdatePrompt?.currentCommitId}
          isPulling={isPullingTutorialUpdate}
          onClose={closeTutorialUpdatePrompt}
          onConfirmPull={() => { void confirmTutorialUpdatePull(); }}
        />
      </ChatPageLayoutProvider>
    </SpaceContext>
  );
}
