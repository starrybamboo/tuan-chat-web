import { useGetUserActiveSpacesQuery } from "api/hooks/chatQueryHooks";
import React, { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ChatPageLayout from "@/components/chat/chatPageLayout";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ChatDiscoverNavPanel from "@/components/chat/discover/chatDiscoverNavPanel";
import DiscoverArchivedSpacesView from "@/components/chat/discover/discoverArchivedSpacesView";
import DiscoverProductionPlaceholder from "@/components/chat/discover/discoverProductionPlaceholder";
import useChatPageContextMenus from "@/components/chat/hooks/useChatPageContextMenus";
import useChatPageLeftDrawer from "@/components/chat/hooks/useChatPageLeftDrawer";
import useChatPageNavigation from "@/components/chat/hooks/useChatPageNavigation";
import useChatPageOrdering from "@/components/chat/hooks/useChatPageOrdering";
import useChatPageSpaceContextMenu from "@/components/chat/hooks/useChatPageSpaceContextMenu";
import useChatUnreadIndicators from "@/components/chat/hooks/useChatUnreadIndicators";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import SpaceContextMenu from "@/components/chat/space/contextMenu/spaceContextMenu";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import { useGlobalContext } from "@/components/globalContextProvider";

const EMPTY_ARRAY: never[] = [];
const isProductionMode = import.meta.env.MODE === "production";

type DiscoverMode = "square" | "my";

interface DiscoverPageProps {
  mode: DiscoverMode;
}

export default function DiscoverPage({ mode }: DiscoverPageProps) {
  const screenSize = useScreenSize();
  const navigate = useNavigate();
  const [searchParam] = useSearchParams();
  const globalContext = useGlobalContext();
  const userId = globalContext.userId ?? -1;
  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const activeSpaceId = useMemo(() => {
    const id = storedIds?.spaceId;
    return typeof id === "number" && Number.isFinite(id) ? id : null;
  }, [storedIds?.spaceId]);
  const {
    isOpenLeftDrawer,
    toggleLeftDrawer,
    closeLeftDrawer,
  } = useChatPageLeftDrawer({
    screenSize,
    isPrivateChatMode: false,
    mobileStateKey: "chat-discover",
  });

  const userSpacesQuery = useGetUserActiveSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? EMPTY_ARRAY;
  const {
    orderedSpaces,
    orderedSpaceIds,
    setUserSpaceOrder,
    spaceRoomIdsByUser,
  } = useChatPageOrdering({
    userId,
    activeSpaceId,
    isPrivateChatMode: false,
    spaces,
    rooms: EMPTY_ARRAY,
  });

  const {
    unreadMessagesNumber,
    privateEntryBadgeCount,
  } = useChatUnreadIndicators({
    globalContext,
    userId,
    isPrivateChatMode: false,
    activeRoomId: null,
  });

  const getSpaceUnreadMessagesNumber = useCallback((spaceId: number) => {
    const roomIds = spaceRoomIdsByUser[String(userId)]?.[String(spaceId)] ?? [];
    let result = 0;
    for (const roomId of roomIds) {
      result += unreadMessagesNumber[roomId] ?? 0;
    }
    return result;
  }, [spaceRoomIdsByUser, unreadMessagesNumber, userId]);

  const { handleOpenPrivate, setActiveRoomId, setActiveSpaceId } = useChatPageNavigation({
    activeSpaceId,
    isOpenLeftDrawer,
    navigate,
    screenSize,
    searchParam,
    setStoredChatIds,
  });
  const {
    spaceContextMenu,
    handleSpaceContextMenu,
    closeSpaceContextMenu,
  } = useChatPageContextMenus();
  const { isSpaceContextArchived, isSpaceContextOwner } = useChatPageSpaceContextMenu({
    currentUserId: globalContext.userId,
    spaceContextMenu,
    spaces,
  });

  const handleCreateSpace = useCallback(() => {
    navigate("/chat?addSpacePop=true");
  }, [navigate]);
  const activeSpace = useMemo(() => {
    if (activeSpaceId == null)
      return null;
    return spaces.find(space => space.spaceId === activeSpaceId) ?? null;
  }, [activeSpaceId, spaces]);
  const spaceContextValue = useMemo(() => {
    return {
      spaceId: activeSpaceId ?? undefined,
      isSpaceOwner: Boolean(activeSpace && activeSpace.userId === globalContext.userId),
      setActiveSpaceId,
      setActiveRoomId,
      toggleLeftDrawer,
      spaceMembers: EMPTY_ARRAY,
    };
  }, [activeSpace, activeSpaceId, globalContext.userId, setActiveRoomId, setActiveSpaceId, toggleLeftDrawer]);

  const chatLeftPanelWidth = useDrawerPreferenceStore(state => state.chatLeftPanelWidth);
  const setChatLeftPanelWidth = useDrawerPreferenceStore(state => state.setChatLeftPanelWidth);

  const leftDrawerToggleLabel = isOpenLeftDrawer ? "收起侧边栏" : "展开侧边栏";
  const shouldShowLeftDrawerToggle = screenSize === "sm" && !isOpenLeftDrawer;

  return (
    <SpaceContext value={spaceContextValue}>
      <>
        <ChatPageLayout
          screenSize={screenSize}
          isOpenLeftDrawer={isOpenLeftDrawer}
          shouldShowLeftDrawerToggle={shouldShowLeftDrawerToggle}
          leftDrawerToggleLabel={leftDrawerToggleLabel}
          toggleLeftDrawer={toggleLeftDrawer}
          chatLeftPanelWidth={chatLeftPanelWidth}
          setChatLeftPanelWidth={setChatLeftPanelWidth}
          spaceSidebar={(
            <ChatSpaceSidebar
              isPrivateChatMode={false}
              isDiscoverMode
              spaces={orderedSpaces}
              spaceOrderIds={orderedSpaceIds}
              onReorderSpaceIds={setUserSpaceOrder}
              activeSpaceId={activeSpaceId}
              getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
              privateUnreadMessagesNumber={privateEntryBadgeCount}
              onOpenPrivate={handleOpenPrivate}
              onSelectSpace={setActiveSpaceId}
              onCreateSpace={handleCreateSpace}
              onSpaceContextMenu={handleSpaceContextMenu}
              onToggleLeftDrawer={toggleLeftDrawer}
              isLeftDrawerOpen={isOpenLeftDrawer}
            />
          )}
          sidePanelContent={(
            <ChatDiscoverNavPanel
              onCloseLeftDrawer={closeLeftDrawer}
              onToggleLeftDrawer={toggleLeftDrawer}
              isLeftDrawerOpen={isOpenLeftDrawer}
              activeMode={mode}
            />
          )}
          mainContent={isProductionMode ? <DiscoverProductionPlaceholder /> : <DiscoverArchivedSpacesView mode={mode} />}
        />
        <SpaceContextMenu
          contextMenu={spaceContextMenu}
          isSpaceOwner={isSpaceContextOwner}
          isArchived={isSpaceContextArchived}
          onClose={closeSpaceContextMenu}
        />
      </>
    </SpaceContext>
  );
}
