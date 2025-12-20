import { useGlobalContext } from "@/components/globalContextProvider";
import { UsersIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useNavigate, useParams } from "react-router";
import ChatList from "./components/ChatList";
import ContextMenuCommon from "./components/ContextMenuCommon";
import { useContextMenuCommon } from "./hooks/useContextMenuCommon";
import { usePrivateMessageList } from "./hooks/usePrivateMessageList";
import { useUnreadCount } from "./hooks/useUnreadCount";

export interface MessageDirectType {
  messageId?: number;
  userId?: number;
  syncId?: number;
  senderId?: number;
  receiverId?: number;
  content?: string;
  messageType?: number;
  replyMessageId?: number;
  status?: number;
  extra?: Record<string, any>;
  createTime?: string;
  updateTime?: string;
}

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
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);
  const isFriendsPage = currentContactUserId === null;

  // 私聊列表相关数据和操作
  const {
    isLoading,
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
      className="flex flex-col h-full bg-base-100"
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        className="flex-1 w-full"
        style={customScrollbarStyle}
      >
        <div className="w-full h-8 font-bold flex items-start justify-center border-b border-base-300">
          <span className="text-lg transform -translate-y-0.5">
            {isShowFriendsList ? "好友" : "私信"}
          </span>
        </div>

        <div className="px-2 pt-2">
          <button
            type="button"
            className={`btn btn-ghost w-full justify-start gap-2 ${isFriendsPage ? "bg-base-200" : ""}`}
            onClick={() => {
              navigate("/chat/private");
              setTimeout(() => {
                setIsOpenLeftDrawer(false);
              }, 0);
            }}
          >
            <UsersIcon className="size-5 opacity-70" />
            <span>好友</span>
          </button>
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

// {isShowFriendsList
//   // 1.显示好友列表
//   ? (
//       <FriendList
//         friendUserInfos={friendUserInfos}
//         updateReadlinePosition={updateReadlinePosition}
//         setIsOpenLeftDrawer={setIsOpenLeftDrawer}
//       />
//     )
//   // 2.显示私聊列表
//   : (
//       <ChatList
//         isSmallScreen={isSmallScreen}
//         realTimeContacts={realTimeContacts}
//         friendUserInfos={friendUserInfos}
//         updateReadlinePosition={updateReadlinePosition}
//         setIsOpenLeftDrawer={setIsOpenLeftDrawer}
//         unreadMessageNumbers={unreadMessageNumbers}
//         currentContactUserId={currentContactUserId}
//         deletedThisContactId={deletedThisContactId}
//       />
//     )}
