import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { motion } from "motion/react";
import { useMemo } from "react";

import { privateChatListItemMotionProps } from "@/components/common/motion/privateChatMotion";

import type { MessageDirectType } from "../types/messageDirect";

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
    <div className="flex flex-col gap-0.5 w-full px-1 py-1">
      {
        realTimeContacts.length === 0
          ? (
              <div className="
                flex flex-col items-center justify-center text-base-content/50
                px-4 py-8 gap-2
              ">
                <svg xmlns="http://www.w3.org/2000/svg" className="
                  size-8 opacity-40
                " fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm">暂无聊天记录</span>
                <span className="text-xs">从好友列表中发起对话</span>
              </div>
            )
          : (
              realTimeContacts.map((contactId, index) => {
                const messages = messagesMap.get(contactId) || [];
                // 过滤掉 messageType === 10000 的消息
                const validMessages = messages.filter(m => m.messageType !== 10000);
                // 获取最新的一条消息
                const lastMessage = validMessages.length > 0 ? validMessages[0] : null;
                const contactUser = friendInfoMap.get(contactId) || getContactUserFromMessage(contactId, lastMessage);

                return (
                  <motion.div key={contactId} {...privateChatListItemMotionProps(index)}>
                    <ChatItem
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
                  </motion.div>
                );
              })
            )
      }
    </div>
  );
}
