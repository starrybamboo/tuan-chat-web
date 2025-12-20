import type { VirtuosoHandle } from "react-virtuoso";
import type { ChatMessageResponse } from "../../../../../api";

import ChatFrame from "@/components/chat/chatFrame";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { XMarkICon } from "@/icons";
import React, { use, useMemo, useRef } from "react";

export default function MessageThreadDrawer() {
  const roomContext = use(RoomContext);

  const threadVirtuosoRef = useRef<VirtuosoHandle | null>(null);

  const threadRootMessageId = useRoomUiStore(state => state.threadRootMessageId);
  const setThreadRootMessageId = useRoomUiStore(state => state.setThreadRootMessageId);
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);

  const allMessages = roomContext.chatHistory?.messages;

  const { rootMessage, threadMessages } = useMemo(() => {
    const source = allMessages ?? [];
    if (!threadRootMessageId) {
      return {
        rootMessage: undefined as ChatMessageResponse | undefined,
        threadMessages: [] as ChatMessageResponse[],
      };
    }

    const root = source.find(m => m.message.messageId === threadRootMessageId);
    const replyList = source
      .filter(m => m.message.threadId === threadRootMessageId && m.message.messageId !== threadRootMessageId)
      .slice()
      // 支持“移动消息”：优先按 position，其次按 syncId
      .sort((a, b) => (a.message.position - b.message.position) || (a.message.syncId - b.message.syncId));

    const list = (root ? [root] : []).concat(replyList);
    return { rootMessage: root, threadMessages: list };
  }, [allMessages, threadRootMessageId]);

  const handleClose = React.useCallback(() => {
    setThreadRootMessageId(undefined);
    setComposerTarget("main");
  }, [setComposerTarget, setThreadRootMessageId]);

  const threadTitle = useMemo(() => {
    const mm = rootMessage?.message;
    if (!mm) {
      return "子区";
    }
    return (mm.extra as any)?.title || mm.content || "子区";
  }, [rootMessage]);

  if (!threadRootMessageId) {
    return (
      <div className="h-full flex flex-col">
        <div className="sticky top-0 bg-base-100 z-10 border-b border-base-300 px-3 py-2 flex items-center justify-between">
          <div className="font-medium truncate">子区</div>
          <button
            type="button"
            className="btn btn-xs btn-ghost btn-square"
            onClick={handleClose}
            aria-label="关闭子区"
            title="关闭子区"
          >
            <XMarkICon className="text-base" />
          </button>
        </div>
        <div className="p-3 text-sm text-base-content/60">未选择 Thread</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" onMouseDown={() => setComposerTarget("thread")}>
      <div className="sticky top-0 bg-base-100 z-10 border-b border-base-300 px-3 py-2 flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-medium truncate">{threadTitle}</div>
        </div>
        <button
          type="button"
          className="btn btn-xs btn-ghost btn-square"
          onClick={handleClose}
          aria-label="关闭子区"
          title="关闭子区"
        >
          <XMarkICon className="text-base" />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {!rootMessage
          ? (
              <div className="text-sm text-base-content/60 p-2">主消息未在本地缓存中（可能尚未加载到历史记录）</div>
            )
          : null}

        {threadMessages.length === 0
          ? (
              <div className="text-sm text-base-content/60 p-2">暂无消息</div>
            )
          : (
              <ChatFrame
                virtuosoRef={threadVirtuosoRef}
                messagesOverride={threadMessages}
                enableWsSync={false}
                enableUnreadIndicator={false}
                isMessageMovable={message => message.messageId !== threadRootMessageId}
              />
            )}
      </div>
    </div>
  );
}
