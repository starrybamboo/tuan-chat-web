import type { ChatDiscoverNavItem } from "@/components/chat/discover/chatDiscoverNavPanel";
import { useGetUserActiveSpacesQuery } from "api/hooks/chatQueryHooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ChatPageLayout from "@/components/chat/chatPageLayout";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ChatDiscoverNavPanel from "@/components/chat/discover/chatDiscoverNavPanel";
import useChatPageContextMenus from "@/components/chat/hooks/useChatPageContextMenus";
import useChatPageLeftDrawer from "@/components/chat/hooks/useChatPageLeftDrawer";
import useChatPageNavigation from "@/components/chat/hooks/useChatPageNavigation";
import useChatPageOrdering from "@/components/chat/hooks/useChatPageOrdering";
import useChatPageSpaceContextMenu from "@/components/chat/hooks/useChatPageSpaceContextMenu";
import useChatUnreadIndicators from "@/components/chat/hooks/useChatUnreadIndicators";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import { useGlobalContext } from "@/components/globalContextProvider";
import { scheduleNonCriticalTask } from "@/utils/scheduleNonCriticalTask";

const EMPTY_ARRAY: never[] = [];
const isProductionMode = import.meta.env.MODE === "production";
const LazyDiscoverArchivedSpacesView = React.lazy(() => import("@/components/chat/discover/discoverArchivedSpacesView"));
const LazyDiscoverProductionPlaceholder = React.lazy(() => import("@/components/chat/discover/discoverProductionPlaceholder"));
const LazyMaterialLibraryPage = React.lazy(() => import("@/components/material/pages/materialLibraryPage"));
const LazySpaceContextMenu = React.lazy(() => import("@/components/chat/space/contextMenu/spaceContextMenu"));

type RepositoryDiscoverMode = "square" | "my";
type MaterialDiscoverMode = "public" | "mine";

type DiscoverPageProps = { section: "repository"; mode: RepositoryDiscoverMode } | { section: "material"; mode: MaterialDiscoverMode };

function getActiveNavItem(props: DiscoverPageProps): ChatDiscoverNavItem {
  if (props.section === "material") {
    return props.mode === "mine" ? "material-mine" : "material-public";
  }
  return props.mode === "my" ? "repository-my" : "repository-square";
}

function DiscoverContentFallback({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-base-content/60">
      <span className="loading loading-spinner loading-md"></span>
      <span className="ml-2">{text}</span>
    </div>
  );
}

export default function DiscoverPage(props: DiscoverPageProps) {
  const { section } = props;
  const screenSize = useScreenSize();
  const navigate = useNavigate();
  const [searchParam] = useSearchParams();
  const globalContext = useGlobalContext();
  const userId = globalContext.userId ?? -1;
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
    navigate,
    screenSize,
    searchParam,
    setStoredChatIds,
  });
  const {
    spaceContextMenu,
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
  const activeNavItem = getActiveNavItem(props);
  const shouldShowProductionPlaceholder = isProductionMode && section === "repository";
  const mainContent = shouldShowProductionPlaceholder
    ? (
        <React.Suspense fallback={<DiscoverContentFallback text="正在加载发现页..." />}>
          <LazyDiscoverProductionPlaceholder
            title="归档仓库暂未开放"
            description="发现页里的归档仓库模块仍在开发中，素材相关能力已开放访问。"
          />
        </React.Suspense>
      )
    : section === "material"
      ? (
          <React.Suspense fallback={<DiscoverContentFallback text="正在加载素材广场..." />}>
            <LazyMaterialLibraryPage mode={props.mode} embedded />
          </React.Suspense>
        )
      : (
          <React.Suspense fallback={<DiscoverContentFallback text="正在加载归档广场..." />}>
            <LazyDiscoverArchivedSpacesView mode={props.mode} />
          </React.Suspense>
        );

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
              onToggleLeftDrawer={toggleLeftDrawer}
              isLeftDrawerOpen={isOpenLeftDrawer}
            />
          )}
          sidePanelContent={(
            <ChatDiscoverNavPanel
              onCloseLeftDrawer={closeLeftDrawer}
              onToggleLeftDrawer={toggleLeftDrawer}
              isLeftDrawerOpen={isOpenLeftDrawer}
              activeItem={activeNavItem}
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
