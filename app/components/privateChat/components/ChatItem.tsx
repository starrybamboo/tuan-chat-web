import { XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useRef } from "react";
import { useNavigate } from "react-router";

export default function ChatItem({
  id,
  isSmallScreen,
  unreadMessageNumber,
  currentContactUserId,
  setIsOpenLeftDrawer,
  updateReadlinePosition,
  deletedContactId,
  openContextMenu,
}: {
  id: number;
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

  return (
    <>
      <button
        className={`btn btn-ghost flex justify-start w-full gap-2 ${currentContactUserId === id ? "bg-info-content/30" : ""}`}
        type="button"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={handleClick}
      >
        <div className="indicator">
          <div className="avatar mask mask-squircle w-8">
            <img
              src={userInfo?.avatar}
              alt={userInfo?.username}
            />
          </div>
          {showedUnreadMessageNumber > 0 && (
            <span className="indicator-item badge badge-xs bg-error">
              {showedUnreadMessageNumber > 99 ? "99+" : showedUnreadMessageNumber}
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1 justify-center min-w-0 relative">
          <div className="flex items-center ">
            <span className="truncate">
              {userInfoQuery.isLoading
                ? (
                    <div className="skeleton h-4 w-20"></div>
                  )
                : (userInfo?.username || `用户${id}`)}
            </span>
          </div>
          <div
            className="flex items-center justify-center absolute w-6 h-6 -right-2 -top-0.5 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-200"
            onClick={handleDeletePC}
          >
            <XMarkICon />
          </div>
        </div>
      </button>
    </>
  );
}

// <ChatPageContextMenu
// contextMenu={contextMenu}
// unreadMessagesNumber={unreadMessagesNumber}
// onClose={closeContextMenu}
// />

// import { useSubscribeRoomMutation, useUnsubscribeRoomMutation } from "../../../api/hooks/messageSessionQueryHooks";

// interface ChatPageContextMenuProps {
//   contextMenu: { x: number; y: number; roomId: number } | null;
//   unreadMessagesNumber: Record<number, number>;
//   onClose: () => void;
// }

// export default function ChatPageContextMenu({
//   contextMenu,
//   unreadMessagesNumber,
//   onClose,
// }: ChatPageContextMenuProps) {
//   const subscribeRoomMutation = useSubscribeRoomMutation();
//   const unsubscribeRoomMutation = useUnsubscribeRoomMutation();

//   if (!contextMenu)
//     return null;

//   const isSubscribed = unreadMessagesNumber[contextMenu.roomId] !== undefined;

//   return (
//     <div
//       className="fixed bg-base-100 shadow-lg rounded-md z-40"
//       style={{ top: contextMenu.y, left: contextMenu.x }}
//       onClick={e => e.stopPropagation()}
//     >
//       <ul className="menu p-2 w-50">
//         {/* --- Notification Settings Menu --- */}
//         <li
//           className="relative group"
//           onClick={() => {
//             isSubscribed ? unsubscribeRoomMutation.mutate(contextMenu.roomId) : subscribeRoomMutation.mutate(contextMenu.roomId);
//             onClose();
//           }}
//         >
//           <div className="flex justify-between items-center w-full">
//             <span>{isSubscribed ? "关闭消息提醒" : "开启消息提醒"}</span>
//           </div>
//         </li>
//       </ul>
//     </div>
//   );
// }
