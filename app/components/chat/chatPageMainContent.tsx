import React from "react";
import { useSearchParams } from "react-router";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import FriendsPage from "@/components/privateChat/FriendsPage";
import RightChatView from "@/components/privateChat/RightChatView";

// 私聊首页只需要私聊组件，群聊/文档工作台进入对应分支后再加载。
const LazyRoomWindow = React.lazy(() => import("@/components/chat/room/roomWindow"));
const LazyBlocksuiteDescriptionEditor = React.lazy(() => import("@/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor"));
const LazySpaceDetailPanel = React.lazy(() => import("@/components/chat/space/drawers/spaceDetailPanel"));
const LazyRoomSettingWindow = React.lazy(() => import("@/components/chat/window/roomSettingWindow"));

function ChatPageLoadingFallback({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-base-content/60">
      <span className="loading loading-spinner loading-md"></span>
      <span className="ml-2">{text}</span>
    </div>
  );
}

function ChatPageMainContent() {
  const { isSpaceDetailRoute } = useChatPageLayoutContext();

  return isSpaceDetailRoute ? <ChatPageSpaceDetailContent /> : <ChatPageChatContent />;
}

function ChatPageChatContent() {
  const {
    isPrivateChatMode,
    activeRoomId,
    setIsOpenLeftDrawer,
    activeSpaceId,
    targetMessageId,
    onOpenThreadInSubWindow,
  } = useChatPageLayoutContext();
  const [searchParams] = useSearchParams();
  const previewParam = searchParams.get("preview");
  const isPreviewMode = previewParam === "1" || previewParam === "true";

  if (isPrivateChatMode) {
    return activeRoomId
      ? (
          <RightChatView
            setIsOpenLeftDrawer={setIsOpenLeftDrawer}
          />
        )
      : (
          <FriendsPage
            setIsOpenLeftDrawer={setIsOpenLeftDrawer}
          />
        );
  }

  if (!activeSpaceId) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
      </div>
    );
  }

  if (activeRoomId == null) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center">请先选择房间</span>
      </div>
    );
  }

  return (
    <React.Suspense fallback={<ChatPageLoadingFallback text="正在加载聊天房间..." />}>
      <LazyRoomWindow
        roomId={activeRoomId}
        spaceId={activeSpaceId ?? -1}
        targetMessageId={targetMessageId}
        viewMode={isPreviewMode}
        onOpenThread={activeRoomId ? threadRootMessageId => onOpenThreadInSubWindow(activeRoomId, threadRootMessageId) : undefined}
      />
    </React.Suspense>
  );
}

function ChatPageSpaceDetailContent() {
  const { activeSpaceId, spaceDetailTab, closeSpaceDetailPanel } = useChatPageLayoutContext();

  if (!activeSpaceId) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full justify-center min-h-0 min-w-0">
      <div className="w-full h-full overflow-auto flex justify-center">
        <React.Suspense fallback={<ChatPageLoadingFallback text="正在加载空间详情..." />}>
          <LazySpaceDetailPanel activeTab={spaceDetailTab} onClose={closeSpaceDetailPanel} />
        </React.Suspense>
      </div>
    </div>
  );
}

export function ChatPageRoomSettingContent() {
  const { roomSettingState, closeRoomSettingPage } = useChatPageLayoutContext();

  if (!roomSettingState) {
    return null;
  }

  return (
    <div className="flex w-full h-full justify-center min-h-0 min-w-0">
      <div className="w-full h-full overflow-auto flex justify-center ">
        <React.Suspense fallback={<ChatPageLoadingFallback text="正在加载房间设置..." />}>
          <LazyRoomSettingWindow
            roomId={roomSettingState.roomId}
            onClose={closeRoomSettingPage}
            defaultTab={roomSettingState.tab}
          />
        </React.Suspense>
      </div>
    </div>
  );
}

interface ChatPageDocContentProps {
  spaceId?: number | null;
  docId?: string | null;
  canViewDocs?: boolean;
  tcHeaderTitle?: string;
}

export function ChatPageDocContent(props: ChatPageDocContentProps = {}) {
  const {
    activeSpaceId,
    activeDocId,
    isKPInSpace,
    activeDocTitleForTcHeader,
    onDocTcHeaderChange,
  } = useChatPageLayoutContext();
  const resolvedSpaceId = props.spaceId ?? activeSpaceId;
  const resolvedDocId = props.docId ?? activeDocId;
  const canViewDocs = props.canViewDocs ?? isKPInSpace;
  const tcHeaderTitle = props.tcHeaderTitle ?? activeDocTitleForTcHeader;

  if (!resolvedSpaceId || !resolvedDocId) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full justify-center min-h-0 min-w-0">
      <div className="w-full h-full overflow-auto flex justify-center">
        {canViewDocs
          ? (
              <div className="w-full h-full overflow-x-auto overflow-y-hidden bg-base-100 border border-base-300 rounded-box">
                <React.Suspense fallback={<ChatPageLoadingFallback text="正在加载文档编辑器..." />}>
                  <LazyBlocksuiteDescriptionEditor
                    workspaceId={`space:${resolvedSpaceId ?? -1}`}
                    spaceId={resolvedSpaceId ?? -1}
                    docId={resolvedDocId}
                    tcHeader={{ enabled: true, fallbackTitle: tcHeaderTitle }}
                    onTcHeaderChange={onDocTcHeaderChange}
                    allowModeSwitch
                    fullscreenEdgeless
                  />
                </React.Suspense>
              </div>
            )
          : (
              <div className="flex items-center justify-center w-full h-full font-bold">
                <span className="text-center">仅 KP 可查看文档</span>
              </div>
            )}
      </div>
    </div>
  );
}

export default ChatPageMainContent;
