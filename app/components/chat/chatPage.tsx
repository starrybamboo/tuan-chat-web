import type { ChatDiscoverMode, ChatPageMainView } from "@/components/chat/chatPage.types";
import type { SpaceContextType } from "@/components/chat/core/spaceContext";
import type { SidebarTree } from "@/components/chat/room/sidebarTree";
import {
  useAddRoomMemberMutation,
  useAddSpaceMemberMutation,
  useGetSpaceInfoQuery,
  useGetSpaceMembersQuery,
  useGetUserActiveSpacesQuery,
  useGetUserRoomsQuery,
  useSetPlayerMutation,
} from "api/hooks/chatQueryHooks";
import { useGetSpaceSidebarTreeQuery, useSetSpaceSidebarTreeMutation } from "api/hooks/spaceSidebarTreeHooks";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import ChatPageLayout from "@/components/chat/chatPageLayout";
import ChatPageMainContent from "@/components/chat/chatPageMainContent";
import ChatPageModals from "@/components/chat/chatPageModals";
import ChatPageSidePanelContent from "@/components/chat/chatPageSidePanelContent";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatPageContextMenus from "@/components/chat/hooks/useChatPageContextMenus";
import useChatPageDetailPanels from "@/components/chat/hooks/useChatPageDetailPanels";
import useChatPageLeftDrawer from "@/components/chat/hooks/useChatPageLeftDrawer";
import useChatPageNavigation from "@/components/chat/hooks/useChatPageNavigation";
import useChatPageOrdering from "@/components/chat/hooks/useChatPageOrdering";
import useChatPageRoute from "@/components/chat/hooks/useChatPageRoute";
import useChatUnreadIndicators from "@/components/chat/hooks/useChatUnreadIndicators";
import useSpaceDocMetaState from "@/components/chat/hooks/useSpaceDocMetaState";
import useSpaceDocMetaSync from "@/components/chat/hooks/useSpaceDocMetaSync";
import useSpaceSidebarTreeActions from "@/components/chat/hooks/useSpaceSidebarTreeActions";
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import ChatPageContextMenu from "@/components/chat/room/contextMenu/chatPageContextMenu";
import { extractDocMetasFromSidebarTree, parseSidebarTree } from "@/components/chat/room/sidebarTree";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import SpaceContextMenu from "@/components/chat/space/contextMenu/spaceContextMenu";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { getDefaultCreateInCategoryMode } from "@/components/chat/utils/createInCategoryMode";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";

/**
 * Chat 页面
 */
interface ChatPageProps {
  /** 初始主视图 */
  initialMainView?: ChatPageMainView;
  /** 发现页模式 */
  discoverMode?: ChatDiscoverMode;
}

export default function ChatPage({ initialMainView, discoverMode }: ChatPageProps) {
  const {
    urlSpaceId,
    urlRoomId,
    activeSpaceId,
    isPrivateChatMode,
    activeDocId,
    activeRoomId,
    targetMessageId,
    isRoomSettingRoute,
    spaceDetailRouteTab,
    isSpaceDetailRoute,
    navigate,
  } = useChatPageRoute();
  const [searchParam, _] = useSearchParams();
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

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceId ?? -1);
  const rooms = useMemo(() => userRoomQuery.data?.data?.rooms ?? [], [userRoomQuery.data?.data?.rooms]);
  const userSpacesQuery = useGetUserActiveSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  const activeSpaceInfoQuery = useGetSpaceInfoQuery(activeSpaceId ?? -1);
  const activeSpaceInfo = useMemo(() => activeSpaceInfoQuery.data?.data, [activeSpaceInfoQuery.data?.data]);

  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
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
  const activeSpace = activeSpaceInfo ?? spaces.find(space => space.spaceId === activeSpaceId);
  const activeSpaceIsArchived = activeSpace?.status === 2;
  const activeSpaceHeaderOverride = useEntityHeaderOverrideStore(state => (activeSpaceId ? state.headers[`space:${activeSpaceId}`] : undefined));
  const activeSpaceNameForUi = activeSpaceHeaderOverride?.title ?? activeSpace?.name;
  const activeSpaceAvatar = activeSpace?.avatar;
  const activeDocHeaderOverride = useDocHeaderOverrideStore(state => (activeDocId ? state.headers[activeDocId] : undefined));

  useSpaceDocMetaSync({
    spaceId: activeSpaceId,
    spaceName: activeSpace?.name,
    rooms,
  });

  const spaceSidebarTreeQuery = useGetSpaceSidebarTreeQuery(activeSpaceId ?? -1);
  const setSpaceSidebarTreeMutation = useSetSpaceSidebarTreeMutation();
  const sidebarTreeVersion = spaceSidebarTreeQuery.data?.data?.version ?? 0;
  const sidebarTree = useMemo(() => {
    return parseSidebarTree(spaceSidebarTreeQuery.data?.data?.treeJson);
  }, [spaceSidebarTreeQuery.data?.data?.treeJson]);

  const handleSaveSidebarTree = useCallback((tree: SidebarTree) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(tree),
    });
  }, [activeSpaceId, setSpaceSidebarTreeMutation, sidebarTreeVersion]);

  const { setActiveSpaceId, setActiveRoomId, handleOpenPrivate } = useChatPageNavigation({
    activeSpaceId,
    isOpenLeftDrawer,
    navigate,
    screenSize,
    searchParam,
    setStoredChatIds,
  });

  const [mainView, setMainView] = useState<ChatPageMainView>(() => initialMainView ?? "chat");
  const discoverModeForUi = discoverMode ?? "square";
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
    isPrivateChatMode,
    isRoomSettingRoute,
    isSpaceDetailRoute,
    spaceDetailRouteTab,
    navigate,
    searchParam,
    setMainView,
    storedIds,
  });

  const handleSelectRoom = useCallback((roomId: number) => {
    setMainView("chat");
    setActiveRoomId(roomId);
  }, [setActiveRoomId, setMainView]);

  const handleSelectDoc = useCallback((docId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setMainView("chat");
    const parsed = parseSpaceDocId(docId);
    if (parsed?.kind === "independent") {
      navigate(`/chat/${activeSpaceId}/doc/${parsed.docId}`);
      return;
    }
    navigate(`/chat/${activeSpaceId}/doc/${encodeURIComponent(docId)}`);
  }, [activeSpaceId, navigate, setMainView]);

  const isKPInSpace = useMemo(() => {
    return Boolean(spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1));
  }, [globalContext.userId, spaceMembersQuery.data?.data]);

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
    isKPInSpace,
    docMetasFromSidebarTree,
  });

  const activeDocTitleForTcHeader = useMemo(() => {
    if (!activeDocId)
      return "";

    const overrideTitle = typeof activeDocHeaderOverride?.title === "string" ? activeDocHeaderOverride.title.trim() : "";
    if (overrideTitle)
      return overrideTitle;

    const fromState = (spaceDocMetas ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromState === "string" && fromState.trim().length > 0)
      return fromState.trim();

    const fromTree = (docMetasFromSidebarTree ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromTree === "string" && fromTree.trim().length > 0)
      return fromTree.trim();

    return "文档";
  }, [activeDocHeaderOverride?.title, activeDocId, docMetasFromSidebarTree, spaceDocMetas]);

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
    setMainView,
  });

  const hasInitPrivateChatRef = useRef(false);
  useEffect(() => {
    if (hasInitPrivateChatRef.current)
      return;
    if (!isPrivateChatMode)
      return;
    hasInitPrivateChatRef.current = true;

    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, [isPrivateChatMode, rooms, setActiveRoomId, setActiveSpaceId, storedIds.roomId, storedIds.spaceId]);

  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
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
      handleSaveSidebarTree(next);
    }

    setIsCreateInCategoryOpen(false);
  }, [activeSpaceId, appendNodeToCategory, buildTreeBaseForWrite, handleSaveSidebarTree, pendingCreateInCategoryId, setActiveRoomId, setIsCreateInCategoryOpen, setMainView, spaceDocMetas]);

  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
  const [inviteRoomId, setInviteRoomId] = useState<number | null>(null);
  const [_sideDrawerState, _setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

  useLayoutEffect(() => {
    if (isPrivateChatMode)
      return;
    if (activeSpaceId == null)
      return;

    const isRoomIdMissingInUrl = !urlRoomId || urlRoomId === "null";
    if (!isRoomIdMissingInUrl)
      return;

    const firstRoomId = orderedRooms[0]?.roomId;
    if (typeof firstRoomId !== "number" || !Number.isFinite(firstRoomId))
      return;

    setActiveRoomId(firstRoomId, { replace: true });
  }, [activeSpaceId, isPrivateChatMode, orderedRooms, setActiveRoomId, urlRoomId]);

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
    handleSpaceContextMenu,
    closeContextMenu,
    closeSpaceContextMenu,
  } = useChatPageContextMenus();

  // spaceContext
  const spaceContext: SpaceContextType = useMemo((): SpaceContextType => {
    return {
      spaceId: activeSpaceId ?? -1,
      isSpaceOwner: !!spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1),
      setActiveSpaceId,
      setActiveRoomId,
      toggleLeftDrawer,
      ruleId: spaces.find(space => space.spaceId === activeSpaceId)?.ruleId,
      spaceMembers: spaceMembersQuery.data?.data ?? [],
    };
  }, [activeSpaceId, globalContext.userId, setActiveRoomId, setActiveSpaceId, spaceMembersQuery.data?.data, spaces, toggleLeftDrawer]);

  const isSpaceOwner = Boolean(spaceContext.isSpaceOwner);

  const getSpaceUnreadMessagesNumber = (spaceId: number) => {
    const roomIds = spaceRoomIdsByUser[String(userId)]?.[String(spaceId)] ?? [];
    let result = 0;
    for (const roomId of roomIds) {
      if (activeRoomId !== roomId)
        result += unreadMessagesNumber[roomId] ?? 0;
    }
    return result;
  };

  const addRoomMemberMutation = useAddRoomMemberMutation();
  const addSpaceMemberMutation = useAddSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();

  const handleInvitePlayer = (roomId: number) => {
    setInviteRoomId(roomId);
  };

  const handleAddRoomMember = (userId: number) => {
    if (inviteRoomId) {
      addRoomMemberMutation.mutate({
        roomId: inviteRoomId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setInviteRoomId(null);
        },
      });
    }
  };

  const handleAddSpaceMember = (userId: number) => {
    if (activeSpaceId) {
      addSpaceMemberMutation.mutate({
        spaceId: activeSpaceId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setIsMemberHandleOpen(false);
        },
      });
    }
  };

  const handleAddSpacePlayer = (userId: number) => {
    if (!activeSpaceId)
      return;

    const isAlreadyMember = (spaceMembersQuery.data?.data ?? []).some(m => m.userId === userId);

    const grantPlayer = () => {
      setPlayerMutation.mutate({
        spaceId: activeSpaceId,
        uidList: [userId],
      }, {
        onSettled: () => {
          setIsMemberHandleOpen(false);
        },
      });
    };

    if (isAlreadyMember) {
      grantPlayer();
      return;
    }

    addSpaceMemberMutation.mutate({
      spaceId: activeSpaceId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        grantPlayer();
      },
      onError: () => {
        grantPlayer();
      },
    });
  };

  const mainContent = (
    <ChatPageMainContent
      isPrivateChatMode={isPrivateChatMode}
      activeRoomId={activeRoomId}
      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
      mainView={mainView}
      discoverMode={discoverModeForUi}
      activeSpaceId={activeSpaceId}
      spaceDetailTab={spaceDetailTab}
      onCloseSpaceDetail={closeSpaceDetailPanel}
      roomSettingState={roomSettingState}
      onCloseRoomSetting={closeRoomSettingPage}
      activeDocId={activeDocId}
      isKPInSpace={isKPInSpace}
      activeDocTitleForTcHeader={activeDocTitleForTcHeader}
      onDocTcHeaderChange={handleDocTcHeaderChange}
      targetMessageId={targetMessageId}
    />
  );
  const sidePanelContent = (
    <ChatPageSidePanelContent
      isPrivateChatMode={isPrivateChatMode}
      mainView={mainView}
      discoverMode={discoverModeForUi}
      onCloseLeftDrawer={closeLeftDrawer}
      onToggleLeftDrawer={toggleLeftDrawer}
      isLeftDrawerOpen={isOpenLeftDrawer}
      currentUserId={userId}
      activeSpaceId={activeSpaceId}
      activeSpaceName={activeSpaceNameForUi}
      activeSpaceIsArchived={activeSpaceIsArchived}
      isSpaceOwner={isSpaceOwner}
      isKPInSpace={isKPInSpace}
      rooms={orderedRooms}
      roomOrderIds={orderedRoomIds}
      onReorderRoomIds={setUserRoomOrder}
      sidebarTree={sidebarTree}
      onSaveSidebarTree={handleSaveSidebarTree}
      onResetSidebarTreeToDefault={resetSidebarTreeToDefault}
      docMetas={spaceDocMetas ?? []}
      onSelectDoc={handleSelectDoc}
      activeRoomId={activeRoomId}
      activeDocId={activeDocId}
      unreadMessagesNumber={unreadMessagesNumber}
      onContextMenu={handleContextMenu}
      onInviteMember={() => setIsMemberHandleOpen(true)}
      onOpenSpaceDetailPanel={openSpaceDetailPanel}
      onSelectRoom={handleSelectRoom}
      onOpenRoomSetting={openRoomSettingPage}
      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
      onOpenCreateInCategory={openCreateInCategory}
    />
  );
  const spaceSidebar = (
    <ChatSpaceSidebar
      isPrivateChatMode={isPrivateChatMode}
      spaces={orderedSpaces}
      spaceOrderIds={orderedSpaceIds}
      onReorderSpaceIds={setUserSpaceOrder}
      activeSpaceId={activeSpaceId}
      getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
      privateUnreadMessagesNumber={privateEntryBadgeCount}
      onOpenPrivate={handleOpenPrivate}
      onToggleLeftDrawer={toggleLeftDrawer}
      isLeftDrawerOpen={isOpenLeftDrawer}
      onSelectSpace={setActiveSpaceId}
      onCreateSpace={() => {
        setIsSpaceHandleOpen(true);
      }}
      onSpaceContextMenu={handleSpaceContextMenu}
    />
  );
  const leftDrawerToggleLabel = isOpenLeftDrawer ? "收起侧边栏" : "展开侧边栏";
  const shouldShowLeftDrawerToggle = screenSize === "sm" && !isOpenLeftDrawer;

  return (
    <SpaceContext value={spaceContext}>
      <ChatPageLayout
        screenSize={screenSize}
        isOpenLeftDrawer={isOpenLeftDrawer}
        shouldShowLeftDrawerToggle={shouldShowLeftDrawerToggle}
        leftDrawerToggleLabel={leftDrawerToggleLabel}
        toggleLeftDrawer={toggleLeftDrawer}
        chatLeftPanelWidth={chatLeftPanelWidth}
        setChatLeftPanelWidth={setChatLeftPanelWidth}
        spaceSidebar={spaceSidebar}
        sidePanelContent={sidePanelContent}
        mainContent={mainContent}
      />
      <ChatPageModals
        isSpaceHandleOpen={isSpaceHandleOpen}
        setIsSpaceHandleOpen={setIsSpaceHandleOpen}
        isCreateInCategoryOpen={isCreateInCategoryOpen}
        closeCreateInCategory={closeCreateInCategory}
        createInCategoryMode={createInCategoryMode}
        setCreateInCategoryMode={setCreateInCategoryMode}
        isKPInSpace={isKPInSpace}
        createDocTitle={createDocTitle}
        setCreateDocTitle={setCreateDocTitle}
        pendingCreateInCategoryId={pendingCreateInCategoryId}
        createDocInSelectedCategory={createDocInSelectedCategory}
        activeSpaceId={activeSpaceId}
        activeSpaceAvatar={activeSpaceAvatar}
        onRoomCreated={handleRoomCreated}
        inviteRoomId={inviteRoomId}
        setInviteRoomId={setInviteRoomId}
        onAddRoomMember={handleAddRoomMember}
        isMemberHandleOpen={isMemberHandleOpen}
        setIsMemberHandleOpen={setIsMemberHandleOpen}
        onAddSpaceMember={handleAddSpaceMember}
        onAddSpacePlayer={handleAddSpacePlayer}
      />
      <ChatPageContextMenu
        contextMenu={contextMenu}
        unreadMessagesNumber={unreadMessagesNumber}
        activeRoomId={activeRoomId}
        onClose={closeContextMenu}
        onInvitePlayer={handleInvitePlayer}
        onOpenRoomSetting={openRoomSettingPage}
      />

      <SpaceContextMenu
        contextMenu={spaceContextMenu}
        isSpaceOwner={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.userId === globalContext.userId
            : false
        }
        isArchived={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.status === 2
            : false
        }
        onClose={closeSpaceContextMenu}
      />
    </SpaceContext>
  );
}
