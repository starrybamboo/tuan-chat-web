import type { ChatDiscoverMode, ChatPageMainView } from "@/components/chat/chatPage.types";
import type { SidebarTree } from "@/components/chat/room/sidebarTree";
import { useGetSpaceInfoQuery, useGetSpaceMembersQuery, useGetUserActiveSpacesQuery, useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import { useGetSpaceSidebarTreeQuery, useSetSpaceSidebarTreeMutation } from "api/hooks/spaceSidebarTreeHooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import ChatPageLayout from "@/components/chat/chatPageLayout";
import ChatPageMainContent from "@/components/chat/chatPageMainContent";
import ChatPageModals from "@/components/chat/chatPageModals";
import ChatPageSidePanelContent from "@/components/chat/chatPageSidePanelContent";
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
import useChatPageSpaceContext from "@/components/chat/hooks/useChatPageSpaceContext";
import useChatPageSpaceContextMenu from "@/components/chat/hooks/useChatPageSpaceContextMenu";
import useChatPageSpaceHandle from "@/components/chat/hooks/useChatPageSpaceHandle";
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
  const activeSpaceHeaderOverride = useEntityHeaderOverrideStore(state => (activeSpaceId ? state.headers[`space:${activeSpaceId}`] : undefined));
  const {
    activeSpace,
    activeSpaceAvatar,
    activeSpaceIsArchived,
    activeSpaceNameForUi,
  } = useChatPageActiveSpaceInfo({
    activeSpaceHeaderOverride,
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

  const spaceMembers = useMemo(() => spaceMembersQuery.data?.data ?? [], [spaceMembersQuery.data?.data]);
  const isKPInSpace = useMemo(() => {
    return Boolean(spaceMembers.some(member => member.userId === globalContext.userId && member.memberType === 1));
  }, [globalContext.userId, spaceMembers]);

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
    setMainView,
  });

  useChatPageAutoNavigation({
    activeSpaceId,
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
    setMainView,
    spaceDocMetas,
  });

  const [_sideDrawerState, _setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

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
      onCreateSpace={openSpaceHandle}
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
        isSpaceOwner={isSpaceContextOwner}
        isArchived={isSpaceContextArchived}
        onClose={closeSpaceContextMenu}
      />
    </SpaceContext>
  );
}
