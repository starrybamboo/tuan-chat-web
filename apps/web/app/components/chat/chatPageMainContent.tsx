import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useLocation } from "@tanstack/react-router";
import { ApiError } from "@tuanchat/openapi-client/core/ApiError";
import React from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/localDb/useChatHistory";
import type { MessageEditorMessage } from "@/components/messageEditor/messageEditorTypes";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import useChatFrameMessages from "@/components/chat/hooks/useChatFrameMessages";
import {
  loadRoomDocumentOverlay,
  removeRoomDocumentOverlay,
  saveRoomDocumentOverlay,
} from "@/components/chat/infra/localDb/chatHistoryDb";
import { useChatHistory } from "@/components/chat/infra/localDb/useChatHistory";
import RoomWindowLoadingState from "@/components/chat/room/roomWindowLoadingState";
import { IconButton } from "@/components/common/IconButton";
import { StateView } from "@/components/common/StateView";
import { useGlobalUserId } from "@/components/globalContextProvider";
import MessageEditor from "@/components/messageEditor/MessageEditor";
import {
  type RoomDocumentCloudSave,
  RoomDocumentEditSession,
  RoomDocumentEditSessionRunner,
  type RoomDocumentEditSessionSnapshot,
} from "@/components/messageEditor/runtime/roomDocumentEditSession";
import { createRoomDocumentPatchGateway } from "@/components/messageEditor/runtime/roomDocumentPatchGateway";
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
    isRoomSelectionPending,
    targetMessageId,
    isSubWindowOpen,
    onToggleSubWindow,
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
    if (isRoomSelectionPending) {
      return <RoomWindowLoadingState />;
    }

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
        isSubWindowOpen={isSubWindowOpen}
        onToggleSubWindow={onToggleSubWindow ?? undefined}
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
  onRequestImportTextPaste?: (text: string, insertAsPlainText: () => void) => void;
  onRemoteMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  chatHistory?: UseChatHistoryReturn;
  tcHeaderTitle?: string;
  tcHeaderImageUrl?: string;
  tcHeaderImageFileId?: number;
  tcHeaderOriginalImageFileId?: number;
  tcHeaderImageMediaType?: string;
}

function useRoomDocumentOverlay(params: {
  baseMessages: MessageEditorMessage[];
  commitConfirmedMessages: (messages: MessageEditorMessage[]) => Promise<void>;
  reconcileAmbiguousInsert?: (save: RoomDocumentCloudSave) => Promise<MessageEditorMessage[] | null>;
  roomId: number | null;
  userId: number | null;
}) {
  const { baseMessages, commitConfirmedMessages, reconcileAmbiguousInsert, roomId, userId } = params;
  const sessionRef = React.useRef<RoomDocumentEditSession | null>(null);
  const runnerRef = React.useRef<RoomDocumentEditSessionRunner | null>(null);
  const gatewayRef = React.useRef(createRoomDocumentPatchGateway());
  const identityKey = roomId && userId ? `${userId}:${roomId}` : null;
  const [messages, setMessages] = React.useState<MessageEditorMessage[]>(baseMessages);
  const [deletedCount, setDeletedCount] = React.useState(0);
  const [sessionSnapshot, setSessionSnapshot] = React.useState<RoomDocumentEditSessionSnapshot | null>(null);
  const overlayRepository = React.useMemo(() => ({
    async load(identity: { roomId: number; userId: number }) {
      const entry = await loadRoomDocumentOverlay<RoomDocumentEditSessionSnapshot>(identity.userId, identity.roomId);
      return entry ? { ...entry.payload, localCachePending: entry.localCachePending } : null;
    },
    remove(identity: { roomId: number; userId: number }) {
      return removeRoomDocumentOverlay(identity.userId, identity.roomId);
    },
    save(snapshot: RoomDocumentEditSessionSnapshot) {
      return saveRoomDocumentOverlay({
        localCachePending: snapshot.localCachePending === true,
        payload: snapshot,
        revision: snapshot.revision,
        roomId: snapshot.identity.roomId,
        userId: snapshot.identity.userId,
      });
    },
  }), []);

  if (identityKey && (!sessionRef.current || `${sessionRef.current.identity.userId}:${sessionRef.current.identity.roomId}` !== identityKey)) {
    sessionRef.current = new RoomDocumentEditSession({
      identity: { roomId: roomId!, userId: userId! },
      messages: baseMessages,
    });
  }

  React.useEffect(() => {
    const session = sessionRef.current;
    if (!session || !identityKey) {
      setMessages(baseMessages);
      return;
    }
    session.acceptBase(baseMessages);
    const snapshot = session.getSnapshot();
    setMessages(snapshot.messages);
    setSessionSnapshot(snapshot);
  }, [baseMessages, identityKey]);

  React.useEffect(() => {
    const session = sessionRef.current;
    if (!session || !identityKey) return;
    let active = true;
    void overlayRepository.load(session.identity)
      .then((snapshot) => {
        if (active && snapshot && session.restore(snapshot, Date.now())) {
          const restoredSnapshot = session.getSnapshot();
          setMessages(restoredSnapshot.messages);
          setSessionSnapshot(restoredSnapshot);
          runnerRef.current?.wake();
        }
      })
      .catch(error => console.error("[room-document] SQLite overlay load failed", error));
    return () => { active = false; };
  }, [identityKey, overlayRepository]);

  React.useEffect(() => {
    const session = sessionRef.current;
    if (!session || !identityKey) return;
    const runner = new RoomDocumentEditSessionRunner({
      clock: { now: () => Date.now() },
      classifyFailure: (save, error) => {
        if (error instanceof ApiError && error.status < 500) return "error";
        return save.messages.some((message) => {
          const messageId = (message as Partial<Message>).messageId;
          return messageId == null || messageId <= 0;
        }) ? "ambiguous" : "retry";
      },
      commitConfirmedMessages,
      gateway: gatewayRef.current,
      onSnapshot: (snapshot) => {
        if (sessionRef.current !== session) return;
        setMessages(snapshot.messages);
        setSessionSnapshot(snapshot);
        if (snapshot.state === "clean") setDeletedCount(0);
      },
      overlayRepository,
      reconcileAmbiguousInsert,
      scheduler: {
        clear: timer => window.clearTimeout(timer as number),
        schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      },
      session,
    });
    runnerRef.current = runner;
    runner.start();
    const retryNow = () => {
      session.retry(Date.now());
      runner.wake();
    };
    window.addEventListener("online", retryNow);
    const retryWhenVisible = () => {
      if (document.visibilityState === "visible") retryNow();
    };
    document.addEventListener("visibilitychange", retryWhenVisible);
    return () => {
      runner.stop();
      if (runnerRef.current === runner) runnerRef.current = null;
      window.removeEventListener("online", retryNow);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [commitConfirmedMessages, identityKey, overlayRepository, reconcileAmbiguousInsert]);

  const change = React.useCallback((nextMessages: MessageEditorMessage[]) => {
    const session = sessionRef.current;
    if (!session) {
      setMessages(nextMessages);
      return;
    }
    session.edit(nextMessages, Date.now());
    const snapshot = session.getSnapshot();
    setMessages(snapshot.messages);
    setSessionSnapshot(snapshot);
    runnerRef.current?.wake();
  }, []);
  const clear = React.useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setDeletedCount(session.getSnapshot().messages.length);
    session.clear([], Date.now());
    const snapshot = session.getSnapshot();
    setMessages(snapshot.messages);
    setSessionSnapshot(snapshot);
    runnerRef.current?.wake();
  }, []);
  const currentIdentity = sessionRef.current?.identity;
  const snapshot = sessionSnapshot && currentIdentity
    && sessionSnapshot.identity.roomId === currentIdentity.roomId
    && sessionSnapshot.identity.userId === currentIdentity.userId
    ? sessionSnapshot
    : sessionRef.current?.getSnapshot();
  return {
    change,
    clear,
    deletedCount,
    messages,
    problemBlockIds: new Set(snapshot?.problemBlockIds),
    progress: snapshot?.progress ?? { phase: "idle" as const },
    state: snapshot?.state ?? "clean",
  };
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
  const onRemoteMessagesSaved = props.onRemoteMessagesSaved;
  const showToolbar = props.showToolbar ?? true;
  const resolvedDocRoomId = resolvedDocId && /^\d+$/.test(resolvedDocId) ? Number(resolvedDocId) : null;
  const userId = useGlobalUserId();
  const isRoomDocument = Boolean(canViewDocs && resolvedDocRoomId);
  const providedRoomHistory = isRoomDocument ? props.chatHistory : undefined;
  const localRoomHistory = useChatHistory(providedRoomHistory ? null : resolvedDocRoomId);
  const roomHistory = providedRoomHistory ?? localRoomHistory;
  const commitEditorMessages = roomHistory.commitEditorMessages;
  const getRoomMessagesByRoomId = roomHistory.getMessagesByRoomId;
  const roomDocMessages = React.useMemo(() => {
    if (!isRoomDocument) {
      return EMPTY_DOC_MESSAGES;
    }

    const cachedMessages = roomHistory.messages
      .map(item => item.message)
      .filter((item): item is Message => Boolean(item));

    return cachedMessages;
  }, [isRoomDocument, roomHistory.messages]);
  const reconcileAmbiguousInsert = React.useCallback(async (save: RoomDocumentCloudSave) => {
    const pendingMessages = save.messages.filter((message) => {
      const messageId = (message as Partial<Message>).messageId;
      return messageId == null || messageId <= 0;
    });
    if (pendingMessages.length === 0) return null;
    const fetched = await getRoomMessagesByRoomId(save.identity.roomId);
    const remoteMessages = fetched.map(item => item.message);
    const consumed = new Set<number>();
    const allMatched = pendingMessages.every((pending) => {
      const candidates = remoteMessages.filter((remote, index) => {
        return !consumed.has(index)
          && remote.messageType === pending.messageType
          && remote.content === pending.content
          && remote.position === (pending as Partial<Message>).position;
      });
      if (candidates.length !== 1) return false;
      consumed.add(remoteMessages.indexOf(candidates[0]));
      return true;
    });
    return allMatched ? remoteMessages : null;
  }, [getRoomMessagesByRoomId]);
  const commitConfirmedRoomDocumentMessages = React.useCallback(async (messages: MessageEditorMessage[]) => {
    const roomMessages = messages
      .filter(message => message.roomId === resolvedDocRoomId)
      .map(message => ({ message: message as Message }) as ChatMessageResponse);
    await commitEditorMessages(roomMessages);
  }, [commitEditorMessages, resolvedDocRoomId]);
  const roomDocumentOverlay = useRoomDocumentOverlay({
    baseMessages: roomDocMessages,
    commitConfirmedMessages: commitConfirmedRoomDocumentMessages,
    reconcileAmbiguousInsert,
    roomId: isRoomDocument ? resolvedDocRoomId : null,
    userId,
  });
  useChatFrameMessages({
    chatHistory: roomHistory,
    currentUserId: null,
  });

  const handleRemoteMessagesSaved = React.useCallback(async (messages: Message[]) => {
    if (isRoomDocument && resolvedDocRoomId) {
      const roomMessages = messages
        .filter(message => message.roomId === resolvedDocRoomId)
        .map(message => ({ message }) as ChatMessageResponse);
      if (roomMessages.length > 0) {
        await commitEditorMessages(roomMessages);
      }
    }
    await onRemoteMessagesSaved?.(messages);
  }, [commitEditorMessages, isRoomDocument, onRemoteMessagesSaved, resolvedDocRoomId]);

  const handleRoomDocumentEdit = React.useCallback((messages: MessageEditorMessage[]) => {
    if (!isRoomDocument || !resolvedDocRoomId) {
      return;
    }
    roomDocumentOverlay.change(messages);
  }, [isRoomDocument, resolvedDocRoomId, roomDocumentOverlay]);
  const roomDocument = React.useMemo(() => isRoomDocument
    ? {
        messages: roomDocumentOverlay.messages,
        onEdit: handleRoomDocumentEdit,
      }
    : undefined, [handleRoomDocumentEdit, isRoomDocument, roomDocumentOverlay.messages]);
  const requestClearRoomDocument = React.useCallback(() => {
    if (!window.confirm("确定清空全文吗？未同步的本地修改会保留，直到服务器确认删除。")) return;
    roomDocumentOverlay.clear();
  }, [roomDocumentOverlay]);

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
                    onRequestImportTextPaste={props.onRequestImportTextPaste}
                    onRemoteMessagesSaved={handleRemoteMessagesSaved}
                    readOnly={props.readOnly}
                    roomDocumentSyncState={roomDocumentOverlay.state}
                    roomDocumentSyncProgress={roomDocumentOverlay.progress}
                    roomDocumentProblemBlockIds={roomDocumentOverlay.problemBlockIds}
                    roomDocumentDeletedCount={roomDocumentOverlay.deletedCount}
                    onRequestClearRoomDocument={isRoomDocument ? requestClearRoomDocument : undefined}
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
                    roomDocument={roomDocument}
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
