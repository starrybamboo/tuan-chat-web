import { useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import { selectionClassName } from "@/components/common/DesignLanguage";
import { unreadBadgeBounceMotionProps } from "@/components/common/motion/chatMessageMotion";
import { Skeleton } from "@/components/common/StatusPrimitives";
import { resolveUserDisplayName, useResolvedUserInfo } from "@/components/common/userAccess.shared";
import UserAvatarComponent from "@/components/common/userAvatar";
import { XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

import type { MessageDirectType } from "../types/messageDirect";
import type { DirectContactUser } from "../utils/directContactUser";

const currentNavigationItemClassName = selectionClassName({ level: "strong" });

export default function ChatItem({
  id,
  user,
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
  user?: DirectContactUser;
  lastMessage: MessageDirectType | null;
  isSmallScreen: boolean;
  unreadMessageNumber: number;
  currentContactUserId: number | null;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  updateReadlinePosition: (contactId: number) => void;
  deletedContactId: (contactId: number) => void;
  openContextMenu: (x: number, y: number, id: number) => void;
}) {
  const resolvedUser = useResolvedUserInfo(user, id);
  const avatarSrc = resolvedUser.avatarThumbUrl || resolvedUser.avatar || undefined;
  const displayName = resolveUserDisplayName({ username: resolvedUser.username }, `用户${id}`);
  const router = useRouter();
  const { setActiveRoomId } = useChatPageLayoutContext();
  const isActive = currentContactUserId === id;

  // 初始化未读消息数
  let showedUnreadMessageNumber = unreadMessageNumber;

  // 如果已经选中联系人，不再触发新消息提醒
  if (isActive) {
    showedUnreadMessageNumber = 0;
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      EndTouchScroll();
    };
  }, []);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (isActive) {
      return;
    }
    setActiveRoomId(id);
    router.history.push(`/chat/private/${id}`);
    updateReadlinePosition(id);
    if (getScreenSize() === "sm") {
      setTimeout(() => {
        setIsOpenLeftDrawer(false);
      }, 0);
    }
  }

  function handleDeletePC(e: React.MouseEvent<HTMLButtonElement>) {
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
    if (msg.messageType === 14)
      return "[视频]";
    if (msg.messageType === 3)
      return "[文件]";
    return msg.content || "";
  };

  return (
    <div className="relative group w-full">
      <button
        className={[
          "flex flex-row flex-nowrap items-center w-full h-14 px-2 gap-3 rounded-lg transition-colors duration-150 motion-reduce:transition-none cursor-pointer",
          isActive
            ? currentNavigationItemClassName
            : "hover:bg-base-200/60 dark:hover:bg-base-300/20",
        ].join(" ")}
        type="button"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={handleClick}
        aria-current={isActive ? "page" : undefined}
        aria-label={`打开与 ${displayName} 的私聊${lastMessage ? `，最后消息：${getMessagePreview(lastMessage)}` : ""}${showedUnreadMessageNumber > 0 ? `，${showedUnreadMessageNumber > 99 ? "99 条以上" : showedUnreadMessageNumber} 条未读` : ""}${isActive ? "，当前已选中" : ""}`}
      >
        <div className="
          w-9 h-9 flex-shrink-0 text-xs font-semibold text-base-content/60
        ">
          {avatarSrc
            ? (
                <UserAvatarComponent
                  userId={resolvedUser.userId}
                  username={displayName}
                  avatar={resolvedUser.avatar}
                  avatarThumbUrl={resolvedUser.avatarThumbUrl}
                  width={9}
                  isRounded={true}
                  stopToastWindow={true}
                  clickEnterProfilePage={false}
                />
              )
            : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-base-300" aria-hidden="true">
                  {displayName.slice(0, 1)}
                </div>
              )}
        </div>

        <div className="flex flex-col flex-1 min-w-0 justify-center gap-0.5">
          <div className="flex items-center w-full min-w-0">
            <span className="font-medium truncate text-sm min-w-0 text-left">
              {resolvedUser.isNameLoading
                ? <Skeleton className="h-3.5 w-20" />
                : displayName}
            </span>
          </div>

          <div className="flex items-center w-full gap-2">
            <span className="
              text-xs text-base-content/50 truncate text-left flex-1 min-w-0
            ">
              {getMessagePreview(lastMessage)}
            </span>
            {showedUnreadMessageNumber > 0 && (
              <motion.span
                className="
                  inline-flex items-center justify-center min-w-[18px] h-[18px]
                  px-1 text-[10px] font-bold rounded-full bg-error
                  text-error-content flex-shrink-0
                "
                {...unreadBadgeBounceMotionProps}
              >
                {showedUnreadMessageNumber > 99 ? "99+" : showedUnreadMessageNumber}
              </motion.span>
            )}
          </div>
        </div>
      </button>

      {/* Hide button for PC - shows on hover or keyboard focus. */}
      {!isSmallScreen && (
        <button
          type="button"
          className="
            absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0
            transition-opacity duration-150 cursor-pointer
            hover:bg-base-300
            focus-visible:opacity-100 focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-info/50
            group-hover:opacity-100
            z-10
          "
          onClick={handleDeletePC}
          aria-label={`隐藏与${displayName}的会话`}
          title="隐藏会话"
        >
          <XMarkICon className="w-3.5 h-3.5 text-base-content/50" />
        </button>
      )}
    </div>
  );
}
