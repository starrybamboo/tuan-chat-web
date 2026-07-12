import { useLocation, useRouter } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import ChatPageLayout from "@/components/chat/chatPageLayout";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatPageContextMenus from "@/components/chat/hooks/useChatPageContextMenus";
import useChatPageLeftDrawer, { CHAT_LEFT_DRAWER_STATE_KEY } from "@/components/chat/hooks/useChatPageLeftDrawer";
import useChatPageNavigation from "@/components/chat/hooks/useChatPageNavigation";
import useChatPageOrdering from "@/components/chat/hooks/useChatPageOrdering";
import useChatPageSpaceContextMenu from "@/components/chat/hooks/useChatPageSpaceContextMenu";
import useChatUnreadIndicators from "@/components/chat/hooks/useChatUnreadIndicators";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import FeaturePlaceholderPage from "@/components/common/featurePlaceholderPage";
import { useGlobalUserId, useGlobalWebSocket } from "@/components/globalContextProvider";
import { scheduleNonCriticalTask } from "@/utils/scheduleNonCriticalTask";
import { useGetUserActiveSpacesQuery } from "api/hooks/chatQueryHooks";

const EMPTY_ARRAY: never[] = [];
const LazySpaceContextMenu = React.lazy(() => import("@/components/chat/space/contextMenu/spaceContextMenu"));

type RepositoryDiscoverMode = "square" | "my";
type MaterialDiscoverMode = "public" | "mine";

type DiscoverPageProps = { section: "repository"; mode: RepositoryDiscoverMode } | { section: "material"; mode: MaterialDiscoverMode };

function getPlaceholderCopy(section: DiscoverPageProps["section"]) {
  if (section === "material") {
    return {
      title: "素材功能正在重写",
      description: "素材库正在重新设计，当前入口暂时保留。",
    };
  }
  return {
    title: "发现功能正在重写",
    description: "归档仓库与公开发现正在重新设计，当前入口暂时保留。",
  };
}

export default function DiscoverPage(props: DiscoverPageProps) {
  const { section } = props;
  const screenSize = useScreenSize();
  const location = useLocation();
  const router = useRouter();
  const searchParam = useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
  const globalUserId = useGlobalUserId();
  const userId = globalUserId ?? -1;
  const webSocketUtils = useGlobalWebSocket();
  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const [shouldLoadPrivateIndicators, setShouldLoadPrivateIndicators] = useState(false);
  const activeSpaceId = useMemo(() => {
    const id = storedIds?.spaceId;
    return typeof id === "number" && Number.isFinite(id) ? id : null;
  }, [storedIds?.spaceId]);

  useEffect(() => {
    if (shouldLoadPrivateIndicators) {
      return;
    }
    return scheduleNonCriticalTask(() => {
      setShouldLoadPrivateIndicators(true);
    });
  }, [shouldLoadPrivateIndicators]);
  const {
    isOpenLeftDrawer,
    toggleLeftDrawer,
  } = useChatPageLeftDrawer({
    screenSize,
    isPrivateChatMode: false,
    drawerStateKey: CHAT_LEFT_DRAWER_STATE_KEY,
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
    webSocketUtils,
    userId,
    isPrivateChatMode: false,
    activeRoomId: null,
    enablePrivateEntryBadge: shouldLoadPrivateIndicators,
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
    navigate: (to, options) => {
      if (options?.replace) {
        router.history.replace(to);
        return;
      }
      router.history.push(to);
    },
    screenSize,
    searchParam,
    setStoredChatIds,
  });
  const {
    spaceContextMenu,
    closeSpaceContextMenu,
  } = useChatPageContextMenus();
  const { isSpaceContextArchived, isSpaceContextOwner } = useChatPageSpaceContextMenu({
    currentUserId: globalUserId,
    spaceContextMenu,
    spaces,
  });

  const handleCreateSpace = useCallback(() => {
    router.history.push("/chat?addSpacePop=true");
  }, [router]);
  const activeSpace = useMemo(() => {
    if (activeSpaceId == null)
      return null;
    return spaces.find(space => space.spaceId === activeSpaceId) ?? null;
  }, [activeSpaceId, spaces]);
  const spaceContextValue = useMemo(() => {
    return {
      spaceId: activeSpaceId ?? undefined,
      isSpaceOwner: Boolean(activeSpace && activeSpace.userId === globalUserId),
      setActiveSpaceId,
      setActiveRoomId,
      toggleLeftDrawer,
      spaceMembers: EMPTY_ARRAY,
    };
  }, [activeSpace, activeSpaceId, globalUserId, setActiveRoomId, setActiveSpaceId, toggleLeftDrawer]);

  const chatLeftPanelWidth = useDrawerPreferenceStore(state => state.chatLeftPanelWidth);
  const setChatLeftPanelWidth = useDrawerPreferenceStore(state => state.setChatLeftPanelWidth);
  const placeholderCopy = getPlaceholderCopy(section);
  const mainContent = (
    <FeaturePlaceholderPage
      title={placeholderCopy.title}
      description={placeholderCopy.description}
    />
  );

  return (
    <SpaceContext value={spaceContextValue}>
      <>
        <ChatPageLayout
          screenSize={screenSize}
          isOpenLeftDrawer={isOpenLeftDrawer}
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
              onToggleLeftDrawer={toggleLeftDrawer}
              isLeftDrawerOpen={isOpenLeftDrawer}
            />
          )}
          mainContent={mainContent}
        />
        {spaceContextMenu
          ? (
              <React.Suspense fallback={null}>
                <LazySpaceContextMenu
                  contextMenu={spaceContextMenu}
                  isSpaceOwner={isSpaceContextOwner}
                  isArchived={isSpaceContextArchived}
                  onClose={closeSpaceContextMenu}
                />
              </React.Suspense>
            )
          : null}
      </>
    </SpaceContext>
  );
}
