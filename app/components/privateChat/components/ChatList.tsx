import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";
import type { MessageDirectType } from "../types/messageDirect";
import { useMemo } from "react";
import ChatItem from "./ChatItem";

function getContactUserFromMessage(contactId: number, message: MessageDirectType | null) {
  if (!message) {
    return { userId: contactId };
  }
  if (message.senderId === contactId) {
    return {
      userId: contactId,
      username: message.senderUsername,
      avatar: message.senderAvatar,
      avatarThumbUrl: message.senderAvatarThumbUrl,
    };
  }
  if (message.receiverId === contactId) {
    return {
      userId: contactId,
      username: message.receiverUsername,
      avatar: message.receiverAvatar,
      avatarThumbUrl: message.receiverAvatarThumbUrl,
    };
  }
  return { userId: contactId };
}

export default function ChatListItem({
  isSmallScreen,
  realTimeContacts,
  sortedRealTimeMessages,
  friendUserInfos,
  updateReadlinePosition,
  setIsOpenLeftDrawer,
  unreadMessageNumbers,
  currentContactUserId,
  deletedThisContactId,
  openContextMenu,
}: {
  isSmallScreen: boolean;
  realTimeContacts: number[];
  sortedRealTimeMessages: [string, MessageDirectType[]][];
  friendUserInfos: FriendResponse[];
  updateReadlinePosition: (id: number) => void;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  unreadMessageNumbers: Record<number, number>;
  currentContactUserId: number | null;
  deletedThisContactId: (contactId: number) => void;
  openContextMenu: (x: number, y: number, id: number) => void;
}) {
  const messagesMap = useMemo(() => {
    return new Map(sortedRealTimeMessages.map(([id, msgs]) => [Number(id), msgs]));
  }, [sortedRealTimeMessages]);
  const friendInfoMap = useMemo(() => {
    return new Map(friendUserInfos
      .filter(friend => friend.userId != null)
      .map(friend => [friend.userId as number, friend]));
  }, [friendUserInfos]);

  return (
    <div className="flex flex-col gap-2 w-full px-1 py-2">
      {
        realTimeContacts.length === 0
          ? (
              <div className="flex flex-col items-center justify-center text-base-content/70 px-4 py-2">
                <span>暂无聊天记录</span>
                <span className="text-sm">快去聊天吧</span>
              </div>
            )
          : (
              realTimeContacts.map((contactId) => {
                const messages = messagesMap.get(contactId) || [];
                // 过滤掉 messageType === 10000 的消息
                const validMessages = messages.filter(m => m.messageType !== 10000);
                // 获取最新的一条消息
                const lastMessage = validMessages.length > 0 ? validMessages[0] : null;
                const contactUser = friendInfoMap.get(contactId) || getContactUserFromMessage(contactId, lastMessage);

                return (
                  <ChatItem
                    key={contactId}
                    id={contactId}
                    user={contactUser}
                    lastMessage={lastMessage}
                    isSmallScreen={isSmallScreen}
                    unreadMessageNumber={unreadMessageNumbers[contactId] || 0}
                    currentContactUserId={currentContactUserId}
                    setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                    updateReadlinePosition={updateReadlinePosition}
                    deletedContactId={deletedThisContactId}
                    openContextMenu={openContextMenu}
                  />
                );
              })
            )
      }
    </div>
  );
}

