import ChatItem from "./ChatItem";

export default function ChatListItem({
  isSmallScreen,
  realTimeContacts,
  updateReadlinePosition,
  setIsOpenLeftDrawer,
  unreadMessageNumbers,
  currentContactUserId,
  deletedThisContactId,
  openContextMenu,
}: {
  isSmallScreen: boolean;
  realTimeContacts: number[];
  friendUserInfos: any[];
  updateReadlinePosition: (id: number) => void;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  unreadMessageNumbers: Record<number, number>;
  currentContactUserId: number | null;
  deletedThisContactId: (contactId: number) => void;
  openContextMenu: (x: number, y: number, id: number) => void;
}) {
  return (
    <div className="p-2 pt-4 flex flex-col gap-2">
      {
        realTimeContacts.length === 0
          ? (
              <div className="flex flex-col items-center justify-center text-base-content/70 px-4 py-2">
                <span>暂无聊天记录</span>
                <span className="text-sm">快去聊天吧</span>
              </div>
            )
          : (
              realTimeContacts.map(contactId => (
                <ChatItem
                  key={contactId}
                  id={contactId}
                  isSmallScreen={isSmallScreen}
                  unreadMessageNumber={unreadMessageNumbers[contactId] || 0}
                  currentContactUserId={currentContactUserId}
                  setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                  updateReadlinePosition={updateReadlinePosition}
                  deletedContactId={deletedThisContactId}
                  openContextMenu={openContextMenu}
                />
              ))
            )
      }
    </div>
  );
}
