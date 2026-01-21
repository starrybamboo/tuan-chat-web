import type { MessageDirectType } from "../types/messageDirect";
import { useMemo } from "react";
import ChatItem from "./ChatItem";

export default function ChatListItem({
  isSmallScreen,
  realTimeContacts,
  sortedRealTimeMessages,
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
  friendUserInfos: any[];
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

                return (
                  <ChatItem
                    key={contactId}
                    id={contactId}
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
