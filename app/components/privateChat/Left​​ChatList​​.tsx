import { useGlobalContext } from "@/components/globalContextProvider";
import { MemberIcon, XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import ChatItem from "./components/ChatItem";
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
  const currentContactUserId = urlRoomId ? Number.parseInt(urlRoomId) : (urlTargetUserId ? Number.parseInt(urlTargetUserId) : null);
  const navigate = useNavigate();

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

  // 是否展示删除按钮
  const [isDeleteContats, setIsDeleteContacts] = useState(false);
  // 移动端是否展示好友列表
  const [isShowFriendsList, setIsShowFriendsList] = useState(false);

  // 屏幕大小
  const isSmallScreen = getScreenSize() === "sm";

  // 图标点击事件
  function handleMemberClick() {
    if (isSmallScreen) {
      setIsShowFriendsList(!isShowFriendsList);
    }
    else {
      if (currentContactUserId) {
        navigate("/chat/private");
      }
    }
  }

  function handleXMarkClick() {
    setIsDeleteContacts(!isDeleteContats);
  }

  // 移动端样式
  if (isSmallScreen) {
    return (
      <div className="flex flex-col h-full bg-base-100">
        <div
          className="flex-1 w-full"
          style={customScrollbarStyle}
        >
          <div className="w-full h-8 font-bold flex items-start justify-center border-b border-base-300">
            <span className="text-lg transform -translate-y-0.5">
              {isShowFriendsList ? "好友" : "私信"}
            </span>
          </div>
          {isShowFriendsList
            // 1.显示好友列表
            ? (
                <div className="p-2 pt-4 flex flex-col gap-2">
                  <button
                    className="btn btn-ghost flex justify-center w-full gap-2"
                    type="button"
                    onClick={handleMemberClick}
                  >
                    <MemberIcon />
                  </button>
                  {
                    friendUserInfos.map((friend, index) => (
                      <button
                        key={friend?.userId || index}
                        className="btn btn-ghost flex justify-start w-full gap-2"
                        type="button"
                        onClick={() => {
                          navigate(`/chat/private/${friend?.userId}`);
                          updateReadlinePosition(friend?.userId || -1);
                          setTimeout(() => {
                            setIsOpenLeftDrawer(false);
                          }, 0);
                        }}
                      >
                        <div className="indicator">
                          <div className="avatar mask mask-squircle w-8">
                            <img
                              src={friend?.avatar}
                              alt={friend?.username}
                            />
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-1 justify-center min-w-0 relative">
                          <div className="flex items-center ">
                            <span className="truncate">
                              {friend?.username || `用户${friend?.userId}`}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  }
                </div>
              )
            // 2.显示私聊列表
            : (
                <div className="p-2 pt-4 flex flex-col gap-2">
                  <div className="flex">
                    <button
                      className="btn btn-ghost flex justify-center w-1/2 gap-2"
                      type="button"
                      onClick={handleMemberClick}
                    >
                      <MemberIcon />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm flex justify-center w-1/2 gap-2"
                      type="button"
                      onClick={handleXMarkClick}
                    >
                      <XMarkICon />
                    </button>
                  </div>
                  {
                    realTimeContacts.length === 0
                      ? (
                          <>
                            <span>暂无私聊列表</span>
                            <span className="text-sm">快去聊天吧</span>
                          </>
                        )
                      : (
                          realTimeContacts.map(contactId => (
                            <ChatItem
                              key={contactId}
                              id={contactId}
                              isDeleteContats={isDeleteContats}
                              unreadMessageNumber={unreadMessageNumbers[contactId] || 0}
                              currentContactUserId={currentContactUserId}
                              setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                              updateReadlinePosition={updateReadlinePosition}
                              deletedContactId={deletedThisContactId}
                            />
                          ))
                        )
                  }
                </div>
              )}
        </div>
      </div>
    );
  }

  // 大屏样式
  return (
    <div className="flex flex-col h-full bg-base-100">
      <div
        className="flex-1 w-full"
        style={customScrollbarStyle}
      >
        <div className="w-full h-8 font-bold flex items-start justify-center border-b border-base-300">
          <span className="text-lg transform -translate-y-0.5">
            {isShowFriendsList ? "好友" : "私信"}
          </span>
        </div>
        {isLoading
          ? (
              <div className="flex items-center justify-center h-32">
                <span className="loading loading-spinner loading-md"></span>
                <span className="ml-2">加载私聊列表...</span>
              </div>
            )
          : realTimeContacts.length === 0
            // 私聊列表为空
            ? (
                <div className="flex flex-col items-center justify-center text-base-content/70 px-4 py-2">
                  <button
                    className="btn btn-ghost flex justify-center w-full gap-2"
                    type="button"
                    onClick={handleMemberClick}
                  >
                    <MemberIcon />
                  </button>
                  <>
                    <span>暂无私聊列表</span>
                    <span className="text-sm">快去聊天吧</span>
                  </>
                </div>
              )
            // 私聊列表不为空
            : (
                <div className="p-2 pt-4 flex flex-col gap-2">
                  <div className="flex">
                    <button
                      className="btn btn-ghost flex justify-center items-center h-8 w-1/2 gap-2"
                      type="button"
                      onClick={handleMemberClick}
                    >
                      <MemberIcon />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm flex justify-center items-center h-8 w-1/2 gap-2"
                      type="button"
                      onClick={handleXMarkClick}
                    >
                      <XMarkICon />
                    </button>
                  </div>
                  {
                    realTimeContacts.map(contactId => (
                      <ChatItem
                        key={contactId}
                        id={contactId}
                        isDeleteContats={isDeleteContats}
                        unreadMessageNumber={unreadMessageNumbers[contactId] || 0}
                        currentContactUserId={currentContactUserId}
                        setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                        updateReadlinePosition={updateReadlinePosition}
                        deletedContactId={deletedThisContactId}
                      />
                    ))
                  }
                </div>
              )}
      </div>
    </div>
  );
}
