import { useParams } from "@tanstack/react-router";

import { useGlobalUserId } from "@/components/globalContextProvider";
import { getScreenSize } from "@/utils/getScreenSize";

import ChatList from "./components/ChatList";
import ContextMenuCommon from "./components/ContextMenuCommon";
import PrivateChatTopTabs from "./components/PrivateChatTopTabs";
import { useContextMenuCommon } from "./hooks/useContextMenuCommon";
import { usePrivateMessageList } from "./hooks/usePrivateMessageList";
import { useUnreadCount } from "./hooks/useUnreadCount";

export default function LeftChatList({ setIsOpenLeftDrawer }: { setIsOpenLeftDrawer: (isOpen: boolean) => void }) {
  // 设置自定义样式
  const customScrollbarStyle: React.CSSProperties = {
    overflowY: "auto",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  };

  const userId = useGlobalUserId() || -1;
  const { roomId: urlRoomId } = useParams({ strict: false });
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : null;

  // 私聊列表相关数据和操作
  const {
    isLoading,
    isInboxReady,
    friendUserInfos,
    realTimeContacts,
    sortedRealTimeMessages,
    deletedThisContactId,
  } = usePrivateMessageList({ userId });

  // 未读消息数
  const { unreadMessageNumbers, updateReadlinePosition }
    = useUnreadCount({
      realTimeContacts,
      sortedRealTimeMessages,
      userId,
      urlRoomId,
      isInboxReady,
    });

  const isSmallScreen = getScreenSize() === "sm";

  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenuCommon();

  const menuItems = [
    {
      label: "删除消息",
      onClick: () => {
        deletedThisContactId(contextMenu?.id || -1);
      },
    },
  ];

  return (
    <div
      className="
        flex h-full w-full min-w-0 flex-col rounded-tl-xl border-l border-t
        border-base-300 bg-base-200
        dark:border-base-300
      "
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        className="flex-1 w-full"
        style={customScrollbarStyle}
      >
        <PrivateChatTopTabs />

        {isLoading
          // 1.加载中
          ? (
              <div className="flex items-center justify-center h-32">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2">加载私聊列表...</span>
              </div>
            )
          // 2.显示私聊列表
          : (
              <ChatList
                isSmallScreen={isSmallScreen}
                realTimeContacts={realTimeContacts}
                sortedRealTimeMessages={sortedRealTimeMessages}
                friendUserInfos={friendUserInfos}
                updateReadlinePosition={updateReadlinePosition}
                setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                unreadMessageNumbers={unreadMessageNumbers}
                currentContactUserId={currentContactUserId}
                deletedThisContactId={deletedThisContactId}
                openContextMenu={openContextMenu}
              />
            )}
      </div>
      <ContextMenuCommon
        menuItems={menuItems}
        contextMenu={contextMenu}
        closeContextMenu={closeContextMenu}
      />
    </div>
  );
}
