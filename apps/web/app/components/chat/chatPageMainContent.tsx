import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useLocation } from "@tanstack/react-router";
import React from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/localDb/useChatHistory";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import useChatFrameMessages from "@/components/chat/hooks/useChatFrameMessages";
import { useChatHistory } from "@/components/chat/infra/localDb/useChatHistory";
import RoomWindowLoadingState from "@/components/chat/room/roomWindowLoadingState";
import { IconButton } from "@/components/common/IconButton";
import { StateView } from "@/components/common/StateView";
import MessageEditor from "@/components/messageEditor/MessageEditor";
import FriendsListPanel from "@/components/privateChat/components/FriendsListPanel";
import NewFriendsPanel from "@/components/privateChat/components/NewFriendsPanel";
import RightChatView from "@/components/privateChat/RightChatView";

import type { ChatMessageResponse, Message } from "../../../api";

// 私聊首页只需要私聊组件，群聊/文档工作台进入对应分支后再加载。
const LazyRoomWindow = React.lazy(() => import("@/components/chat/room/roomWindow"));
const LazySpaceDetailPanel = React.lazy(() => import("@/components/chat/space/drawers/spaceDetailPanel"));
const LazyRoomSettingWindow = React.lazy(() => import("@/components/chat/window/roomSettingWindow"));
const EMPTY_DOC_MESSAGES: Message[] = [];

function RoomWindowLoadingFallback() {
  return <RoomWindowLoadingState />;
}

function ChatPageLoadingFallback({ text }: { text: string }) {
  return <StateView loading title={text} className="size-full py-0" />;
}

type ChatPageDocToolbarProps = {
  onBack?: () => void;
}

function ChatPageDocToolbar({ onBack }: ChatPageDocToolbarProps) {
  return (
    <div className="relative z-50">
      <div className="
        relative z-50 flex items-center justify-between overflow-visible
        border-y border-base-300
        dark:border-base-300
      ">
        <div
          className="
            flex h-10 w-full items-center justify-between px-2 border
            border-white/40 bg-white/40 backdrop-blur-xl
            dark:border-white/10 dark:bg-base-300/25
          "
        >
          <IconButton
            variant="ghost"
            size="sm"
            shape="square"
            className="rounded-md active:scale-95"
            onClick={() => onBack?.()}
            label="返回房间"
            title="返回房间"
            icon={<ArrowLeftIcon className="size-4" weight="regular" />}
          />
        </div>
      </div>
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
    activeSpaceId,
    targetMessageId,
    privateChatTab,
  } = useChatPageLayoutContext();
  const location = useLocation();
  const searchParams = React.useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
  const previewParam = searchParams.get("preview");
  const isPreviewMode = previewParam === "1" || previewParam === "true";

  if (isPrivateChatMode) {
    const privateChatContent = (() => {
      if (privateChatTab === "new-friends") {
        return <NewFriendsPanel />;
      }

      return activeRoomId
        ? (
            <RightChatView />
          )
        : <FriendsListPanel />;
    })();

    return (
      <div className="
        size-full overflow-hidden border-t border-base-300
        dark:border-base-300
      ">
        <div
          key={privateChatTab}
          className="private-chat-panel-entry size-full"
        >
          {privateChatContent}
        </div>
      </div>
    );
  }

  if (!activeSpaceId) {
    return (
      <div className="flex items-center justify-center size-full font-bold">
        <span className="
          text-center
          lg:hidden
        ">请在左侧选择空间或房间</span>
      </div>
    );
  }

  if (activeRoomId == null) {
    return (
      <div className="flex items-center justify-center size-full font-bold">
        <span className="text-center">请先选择房间</span>
      </div>
    );
  }

  return (
    <React.Suspense fallback={<RoomWindowLoadingFallback />}>
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
      <div className="flex items-center justify-center size-full font-bold">
        <span className="
          text-center
          lg:hidden
        ">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <div className="flex size-full justify-center min-h-0 min-w-0">
      <div className="size-full overflow-auto flex justify-center">
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
    <div className="flex size-full justify-center min-h-0 min-w-0">
      <div className="size-full overflow-auto flex justify-center">
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

type ChatPageDocContentProps = {
  spaceId?: number | null;
  docId?: string | null;
  canViewDocs?: boolean;
  onBack?: () => void;
  showToolbar?: boolean;
  readOnly?: boolean;
  initialMessages?: Message[];
  onRequestImportTextPaste?: (text: string, insertAsPlainText: () => void) => void;
  onRemoteMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  chatHistory?: UseChatHistoryReturn | null;
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
  const showToolbar = props.showToolbar ?? true;
  const initialMessages = props.initialMessages ?? EMPTY_DOC_MESSAGES;
  const resolvedDocRoomId = resolvedDocId && /^\d+$/.test(resolvedDocId) ? Number(resolvedDocId) : null;
  const isRoomDocument = Boolean(canViewDocs && resolvedDocRoomId);
  const useProvidedRoomHistory = Boolean(isRoomDocument && props.chatHistory);
  const localRoomHistory = useChatHistory(useProvidedRoomHistory ? null : resolvedDocRoomId);
  const roomHistory = useProvidedRoomHistory ? props.chatHistory : localRoomHistory;
  const roomDocMessages = React.useMemo(() => {
    if (!isRoomDocument) {
      return initialMessages;
    }

    const cachedMessages = (roomHistory?.messages ?? [])
      .map(item => item.message)
      .filter((item): item is Message => Boolean(item));

    return cachedMessages.length > 0 ? cachedMessages : initialMessages;
  }, [initialMessages, isRoomDocument, roomHistory?.messages]);
  useChatFrameMessages({
    chatHistory: roomHistory ?? undefined,
    currentUserId: null,
  });

  const handleRemoteMessagesSaved = React.useCallback(async (messages: Message[]) => {
    if (!props.onRemoteMessagesSaved && isRoomDocument && resolvedDocRoomId && roomHistory) {
      const roomMessages = messages
        .filter(message => message.roomId === resolvedDocRoomId)
        .map(message => ({ message }) as ChatMessageResponse);
      if (roomMessages.length > 0) {
        await roomHistory.addOrUpdateMessages(roomMessages);
      }
    }
    await props.onRemoteMessagesSaved?.(messages);
  }, [isRoomDocument, props.onRemoteMessagesSaved, resolvedDocRoomId, roomHistory]);

  if (!resolvedSpaceId || !resolvedDocId) {
    return (
      <div className="flex items-center justify-center size-full font-bold">
        <span className="
          text-center
          lg:hidden
        ">请在左侧选择空间或房间</span>
      </div>
    );
  }

  return (
    <div className="flex size-full justify-center min-h-0 min-w-0">
      <div className="size-full overflow-hidden flex justify-center">
        {canViewDocs
          ? (
              <div className="
                flex size-full min-h-0 flex-col overflow-hidden bg-base-100
              ">
                {showToolbar && <ChatPageDocToolbar onBack={handleBack} />}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <MessageEditor
                    className="h-full min-h-0 rounded-none border-t-0!"
                    docId={resolvedDocId}
                    initialMessages={roomDocMessages}
                    onRequestImportTextPaste={props.onRequestImportTextPaste}
                    onRemoteMessagesSaved={handleRemoteMessagesSaved}
                    readOnly={props.readOnly}
                    remotePatchSourceSurface="doc_view"
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
              <div className="
                flex items-center justify-center size-full font-bold
              ">
                <span className="text-center">仅 KP 可查看文档</span>
              </div>
            )}
      </div>
    </div>
  );
}

export default ChatPageMainContent;
