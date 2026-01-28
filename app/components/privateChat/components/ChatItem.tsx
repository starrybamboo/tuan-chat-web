import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useRef } from "react";
import { useNavigate } from "react-router";
import { XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

interface MessageDirectType {
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

export default function ChatItem({
  id,
  lastMessage,
  isSmallScreen,
  unreadMessageNumber,
  currentContactUserId,
  setIsOpenLeftDrawer,
  updateReadlinePosition,
  deletedContactId,
  openContextMenu,
}: {
  id: number;
  lastMessage: MessageDirectType | null;
  isSmallScreen: boolean;
  unreadMessageNumber: number;
  currentContactUserId: number | null;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  updateReadlinePosition: (contactId: number) => void;
  deletedContactId: (contactId: number) => void;
  openContextMenu: (x: number, y: number, id: number) => void;
}) {
  const userInfoQuery = useGetUserInfoQuery(id);
  const userInfo = userInfoQuery.data?.data;
  const navigate = useNavigate();

  // 初始化未读消息数
  let showedUnreadMessageNumber = unreadMessageNumber;

  // 如果已经选中联系人，不再触发新消息提醒
  if (currentContactUserId === id) {
    showedUnreadMessageNumber = 0;
  }

  const timer = useRef<NodeJS.Timeout | null>(null);

  function EndTouchScroll() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function handleTouchStart(e: React.TouchEvent<HTMLButtonElement>) {
    timer.current = setTimeout(() => {
      if (isSmallScreen) {
        const touch = e.touches[0];
        if (touch) {
          openContextMenu(touch.clientX, touch.clientY, id);
        }
      }
    }, 500);
  }

  function handleTouchEnd() {
    EndTouchScroll();
  }

  function handleTouchCancel() {
    EndTouchScroll();
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (currentContactUserId === id) {
      return;
    }
    navigate(`/chat/private/${id}`);
    updateReadlinePosition(id);
    if (getScreenSize() === "sm") {
      setTimeout(() => {
        setIsOpenLeftDrawer(false);
      }, 0);
    }
  }

  function handleDeletePC(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!isSmallScreen) {
      deletedContactId(id);
    }
  }

  const getMessagePreview = (msg: MessageDirectType | null) => {
    if (!msg)
      return "";
    if (msg.messageType === 2)
      return "[图片]";
    if (msg.messageType === 3)
      return "[文件]";
    return msg.content || "";
  };

  return (
    <div className="relative group w-full">
      <button
        className={`btn btn-ghost flex flex-row flex-nowrap items-center justify-start w-full h-16 px-2 gap-3 ${currentContactUserId === id ? "bg-base-200" : ""}`}
        type="button"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={handleClick}
      >
        <div className="avatar mask mask-squircle w-10 h-10 flex-shrink-0">
          <img
            src={userInfo?.avatar}
            alt={userInfo?.username}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0 h-full justify-center gap-1">
          <div className="flex items-center w-full min-w-0">
            <span className="font-bold truncate text-base min-w-0 text-left">
              {userInfoQuery.isLoading
                ? <div className="skeleton h-4 w-20"></div>
                : (userInfo?.username || `用户${id}`)}
            </span>
          </div>

          <div className="flex items-center w-full gap-2">
            <span className="text-sm text-base-content/60 truncate text-left flex-1 min-w-0">
              {getMessagePreview(lastMessage)}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {showedUnreadMessageNumber > 0 && (
                <div className="badge badge-sm badge-error">
                  {showedUnreadMessageNumber > 99 ? "99+" : showedUnreadMessageNumber}
                </div>
              )}
              {/* {lastMessage?.createTime && (
                <span className="text-xs text-base-content/50 whitespace-nowrap group-hover:opacity-0 transition-opacity duration-200">
                  {formatTimeSmartly(lastMessage.createTime)}
                </span>
              )} */}
            </div>
          </div>
        </div>
      </button>

      {/* Delete button for PC - shows on hover */}
      {!isSmallScreen && (
        <div
          className="absolute right-2 top-3 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:bg-base-300 z-10"
          onClick={handleDeletePC}
        >
          <XMarkICon className="w-4 h-4 text-base-content/50" />
        </div>
      )}
    </div>
  );
}
