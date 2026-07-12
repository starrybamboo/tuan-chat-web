import { useParams } from "@tanstack/react-router";

import { appToast } from "@/components/common/appToast/appToast";
import { StateView } from "@/components/common/StateView";
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
    restoreDeletedContactId,
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

  const hideContactId = (contactId: number) => {
    if (contactId <= 0) {
      return;
    }
    deletedThisContactId(contactId);
    appToast.info({
      title: "已隐藏会话",
      description: "收到新消息或重新发起私聊后会自动恢复。",
      actions: [
        {
          label: "撤销",
          onClick: () => restoreDeletedContactId(contactId),
        },
      ],
    });
  };

  const menuItems = [
    {
      label: "隐藏会话",
      onClick: () => {
        hideContactId(contextMenu?.id || -1);
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
              <StateView loading title="加载私聊列表..." className="h-32 py-0" />
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
                deletedThisContactId={hideContactId}
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
