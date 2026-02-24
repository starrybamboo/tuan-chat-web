import { useGetSpaceInfoQuery, useGetSpaceMembersQuery, useGetUserActiveSpacesQuery, useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import { useCallback, useEffect, useMemo } from "react";
import { Outlet, useSearchParams } from "react-router";
import { ChatPageOverlays, ChatPagePanels } from "@/components/chat/chatPageContainers";
import { ChatPageLayoutProvider } from "@/components/chat/chatPageLayoutProvider";
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
import { parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import { extractDocMetasFromSidebarTree } from "@/components/chat/room/sidebarTree";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";

const EMPTY_ARRAY: never[] = [];

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
    setIsOpen: setIsSubWindowOpen,
    setWidth: setSubWindowWidth,
    setTab: setSubWindowTab,
    setRoomId: setSubWindowRoomId,
    setDocId: setSubWindowDocId,
    setThreadRootMessageId: setSubWindowThreadRootMessageId,
  } = useChatPageSubWindow({
    activeSpaceId,
    activeRoomId,
    activeDocId,
  });

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const activeSpaceIdForQuery = activeSpaceId ?? -1;
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceIdForQuery);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceIdForQuery);
  const rooms = userRoomQuery.data?.data?.rooms ?? EMPTY_ARRAY;
  const userSpacesQuery = useGetUserActiveSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? EMPTY_ARRAY;

  const activeSpaceInfoQuery = useGetSpaceInfoQuery(activeSpaceIdForQuery);
  const activeSpaceInfo = activeSpaceInfoQuery.data?.data;

  const globalContext = useGlobalContext();
  const userId = globalContext.userId ?? -1;
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

  const { sidebarTree, saveSidebarTree: handleSaveSidebarTree } = useChatPageSidebarTree({ activeSpaceId });

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
    isPrivateChatMode,
    isRoomSettingRoute,
    spaceDetailRouteTab,
    navigate,
    searchParam,
    storedIds,
  });

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
  const isKPInSpace = useMemo(() => {
    return Boolean(spaceMembers.some(member => member.userId === userId && member.memberType === 1));
  }, [spaceMembers, userId]);

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
  const spaceDocMetasList = spaceDocMetas ?? EMPTY_ARRAY;

  const activeDocTitleForTcHeader = useChatPageDocTitle({
    activeDocId,
    activeDocHeaderOverride,
    docMetasFromSidebarTree,
    spaceDocMetas,
  });

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
    handleSpaceContextMenu,
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

  const handleOpenThreadInSubWindow = useCallback((roomId: number, threadRootMessageId: number) => {
    setSubWindowRoomId(roomId);
    setSubWindowThreadRootMessageId(threadRootMessageId);
    setIsSubWindowOpen(true);
  }, [setIsSubWindowOpen, setSubWindowRoomId, setSubWindowThreadRootMessageId]);

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
      onOpenThreadInSubWindow: handleOpenThreadInSubWindow,
    };
  }, [
    activeDocId,
    activeDocTitleForTcHeader,
    activeRoomId,
    activeSpaceId,
    closeRoomSettingPage,
    closeSpaceDetailPanel,
    handleDocTcHeaderChange,
    handleOpenThreadInSubWindow,
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
    rooms: orderedRooms,
    roomOrderIds: orderedRoomIds,
    onReorderRoomIds: setUserRoomOrder,
    sidebarTree,
    onSaveSidebarTree: handleSaveSidebarTree,
    onResetSidebarTreeToDefault: resetSidebarTreeToDefault,
    docMetas: spaceDocMetasList,
    onSelectDoc: handleSelectDoc,
    activeRoomId,
    activeDocId,
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
    onSpaceContextMenu: handleSpaceContextMenu,
  };
  const leftDrawerToggleLabel = isOpenLeftDrawer ? "收起侧边栏" : "展开侧边栏";
  const shouldShowLeftDrawerToggle = screenSize === "sm" && !isOpenLeftDrawer;
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

  return (
    <SpaceContext value={spaceContext}>
      <ChatPageLayoutProvider value={layoutContextValue}>
        <ChatPagePanels
          layoutProps={layoutProps}
          mainContent={<Outlet />}
          subWindowContent={(
            <ChatPageSubWindow
              screenSize={screenSize}
              activeSpaceId={activeSpaceId}
              isKPInSpace={isKPInSpace}
              rooms={orderedRooms}
              docMetas={spaceDocMetasList}
              isOpen={isSubWindowOpen}
              width={subWindowWidth}
              tab={subWindowTab}
              roomId={subWindowRoomId}
              docId={subWindowDocId}
              threadRootMessageId={subWindowThreadRootMessageId}
              setIsOpen={setIsSubWindowOpen}
              setWidth={setSubWindowWidth}
              setTab={setSubWindowTab}
              setRoomId={setSubWindowRoomId}
              setDocId={setSubWindowDocId}
              setThreadRootMessageId={setSubWindowThreadRootMessageId}
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
      </ChatPageLayoutProvider>
    </SpaceContext>
  );
}
