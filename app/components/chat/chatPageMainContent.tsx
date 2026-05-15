import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useLocation } from "@tanstack/react-router";
import React from "react";
import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import MessageEditor from "@/components/messageEditor/MessageEditor";

import FriendsPage from "@/components/privateChat/FriendsPage";
import RightChatView from "@/components/privateChat/RightChatView";

// 私聊首页只需要私聊组件，群聊/文档工作台进入对应分支后再加载。
const LazyRoomWindow = React.lazy(() => import("@/components/chat/room/roomWindow"));
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

interface ChatPageDocToolbarProps {
  onBack?: () => void;
}

function ChatPageDocToolbar({ onBack }: ChatPageDocToolbarProps) {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-gray-300 bg-base-100 px-2 dark:border-gray-700">
      <button
        type="button"
        className="btn btn-ghost btn-square btn-sm rounded-md active:scale-95"
        onClick={() => onBack?.()}
        aria-label="返回房间"
        title="返回房间"
      >
        <ArrowLeftIcon className="size-4" weight="bold" />
      </button>
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
  } = useChatPageLayoutContext();
  const location = useLocation();
  const searchParams = React.useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
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
  onBack?: () => void;
  tcHeaderTitle?: string;
  tcHeaderImageUrl?: string;
  tcHeaderImageFileId?: number;
  tcHeaderOriginalImageFileId?: number;
  tcHeaderImageMediaType?: string;
}

export function ChatPageDocContent(props: ChatPageDocContentProps = {}) {
  const {
    activeSpaceId,
    activeDocId,
    isKPInSpace,
    activeDocTitleForTcHeader,
  } = useChatPageLayoutContext();
  const resolvedSpaceId = props.spaceId ?? activeSpaceId;
  const resolvedDocId = props.docId ?? activeDocId;
  const canViewDocs = props.canViewDocs ?? isKPInSpace;
  const tcHeaderTitle = props.tcHeaderTitle ?? activeDocTitleForTcHeader;
  const handleBack = props.onBack;

  if (!resolvedSpaceId || !resolvedDocId) {
    return (
      <div className="flex items-center justify-center w-full h-full font-bold">
        <span className="text-center lg:hidden">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full justify-center min-h-0 min-w-0">
      <div className="w-full h-full overflow-hidden flex justify-center">
        {canViewDocs
          ? (
              <div className="flex w-full h-full min-h-0 flex-col overflow-hidden bg-base-100">
                <ChatPageDocToolbar onBack={handleBack} />
                <div className="min-h-0 flex-1 overflow-hidden">
                  <MessageEditor
                    className="h-full min-h-0 rounded-none !border-t-0"
                    docId={resolvedDocId}
                    spaceId={resolvedSpaceId ?? -1}
                    tcHeader={{
                      enabled: true,
                      fallbackTitle: tcHeaderTitle,
                      fallbackImageUrl: props.tcHeaderImageUrl,
                      fallbackImageFileId: props.tcHeaderImageFileId,
                      fallbackOriginalImageFileId: props.tcHeaderOriginalImageFileId,
                      fallbackImageMediaType: props.tcHeaderImageMediaType,
                    }}
                    workspaceId={`space:${resolvedSpaceId ?? -1}`}
                  />
                </div>
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
