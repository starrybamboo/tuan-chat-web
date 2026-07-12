import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useGlobalUserId } from "@/components/globalContextProvider";
import { useGetInboxMessageWithUserQuery, useUpdateReadPositionMutation } from "api/hooks/MessageDirectQueryHooks";

import type { MessageDirectResponse } from "../../../api";

import ContextMenu from "./components/ContextMenu";
import MessageInput from "./components/MessageInput";
import MessageWindow from "./components/MessageWindow";
import TopInfo from "./components/TopInfo";
import { useContextMenu } from "./hooks/useContextMenu";
import { usePrivateMessageReceiver } from "./hooks/usePrivateMessageRecever";
import { usePrivateUnreadStateStore } from "./privateUnreadStateStore";
import { getLatestIncomingSync } from "./privateUnreadUtils";

export default function RightChatView() {
  const userId = useGlobalUserId() || -1;
  const { roomId: urlRoomId } = useParams({ strict: false });
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : null;
  const [replyMessage, setReplyMessage] = useState<MessageDirectResponse | null>(null);

  // 历史消息hook（全局）
  const { historyMessages, refetch } = useGetInboxMessageWithUserQuery(userId, currentContactUserId || -1);
  const { currentContactUserInfo, allMessages } = usePrivateMessageReceiver(userId, currentContactUserId, historyMessages);
  const latestIncomingSync = useMemo(() => {
    if (!currentContactUserId) {
      return 0;
    }
    return getLatestIncomingSync(allMessages, currentContactUserId);
  }, [allMessages, currentContactUserId]);
  const optimisticReadSync = usePrivateUnreadStateStore((state) => {
    if (!currentContactUserId) {
      return 0;
    }
    return state.optimisticReadSyncMap[currentContactUserId] ?? 0;
  });
  const markContactAsRead = usePrivateUnreadStateStore(state => state.markContactAsRead);
  const updateReadPositionMutation = useUpdateReadPositionMutation();

  useEffect(() => {
    if (!currentContactUserId || latestIncomingSync <= 0) {
      return;
    }
    if (latestIncomingSync <= optimisticReadSync) {
      return;
    }

    markContactAsRead(currentContactUserId, latestIncomingSync);
    updateReadPositionMutation.mutate({ targetUserId: currentContactUserId });
  }, [currentContactUserId, latestIncomingSync, markContactAsRead, optimisticReadSync, updateReadPositionMutation]);

  // 右键菜单hook（全局）
  const { contextMenu, setContextMenu, handleContextMenu, handleRevokeMessage } = useContextMenu({ refetch });
  const handleReplyMessage = useCallback((message: MessageDirectResponse) => {
    setReplyMessage(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyMessage(null);
  }, []);

  useEffect(() => {
    setReplyMessage(null);
  }, [currentContactUserId]);

  return (
    <div
      className="
        w-full h-full bg-base-100 border-l border-base-300 flex flex-col
      "
      onContextMenu={handleContextMenu}
      onPointerDown={() => setContextMenu(null)}
    >
      {/* 顶部信息栏 */}
      <TopInfo
        currentContactUserInfo={currentContactUserInfo}
      />

      {/* 聊天消息区域 */}
      <MessageWindow
        currentContactUserId={currentContactUserId}
        allMessages={allMessages}
        userId={userId}
      />

      {/* 输入区域 */}
      <MessageInput
        key={currentContactUserId}
        userId={userId}
        currentContactUserId={currentContactUserId}
        replyMessage={replyMessage}
        onCancelReply={handleCancelReply}
        onMessageSent={handleCancelReply}
      />

      {/* 右键菜单 */}
      <ContextMenu
        allMessages={allMessages}
        userId={userId}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        handleRevokeMessage={handleRevokeMessage}
        handleReplyMessage={handleReplyMessage}
      />
    </div>
  );
}
