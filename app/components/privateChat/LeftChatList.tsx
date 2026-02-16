import { ChatCircleIcon, UserCirclePlusIcon, UserListIcon } from "@phosphor-icons/react";
import { useNavigate, useParams } from "react-router";
import { useGlobalContext } from "@/components/globalContextProvider";
import { SidebarSimpleIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import ChatList from "./components/ChatList";
import ContextMenuCommon from "./components/ContextMenuCommon";
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

  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const { targetUserId: urlTargetUserId, roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const currentContactUserId = urlRoomId
    ? Number.parseInt(urlRoomId)
    : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);

  // 私聊列表相关数据和操作
  const {
    isLoading,
    isInboxReady,
    friendUserInfos,
    realTimeContacts,
    sortedRealTimeMessages,
    deletedThisContactId,
  } = usePrivateMessageList({ globalContext, userId });

  // 未读消息数
  const { unreadMessageNumbers, updateReadlinePosition }
    = useUnreadCount({
      realTimeContacts,
      sortedRealTimeMessages,
      userId,
      urlRoomId,
      isInboxReady,
    });

  // 移动端是否展示好友列表
  const isShowFriendsList = false;
  // 屏幕大小
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
      className="rounded-tl-xl flex flex-col h-full bg-base-200"
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        className="flex-1 w-full"
        style={customScrollbarStyle}
      >
        <div className="flex items-center justify-between h-10 min-w-0 border-b border-gray-300 dark:border-gray-700 rounded-tl-xl px-2">
          <div className="flex items-center justify-start gap-2 min-w-0 flex-1">
            <ChatCircleIcon className="size-4 opacity-70 inline-block" weight="fill" />
            <span className="text-base font-bold truncate leading-none min-w-0 flex-1 text-left">
              {isShowFriendsList ? "好友" : "私信"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label="收起侧边栏"
              title="收起侧边栏"
              onClick={() => {
                setIsOpenLeftDrawer(false);
              }}
            >
              <SidebarSimpleIcon />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label="好友列表"
              title="好友列表"
              onClick={() => {
                navigate("/chat/private?tab=all");
                if (isSmallScreen) {
                  setTimeout(() => {
                    setIsOpenLeftDrawer(false);
                  }, 0);
                }
              }}
            >
              <UserListIcon className="size-6 opacity-70" weight="fill" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label="添加好友"
              title="添加好友"
              onClick={() => {
                navigate("/chat/private?tab=add");
                if (isSmallScreen) {
                  setTimeout(() => {
                    setIsOpenLeftDrawer(false);
                  }, 0);
                }
              }}
            >
              <UserCirclePlusIcon className="size-6 opacity-70" weight="fill" />
            </button>
          </div>
        </div>

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
