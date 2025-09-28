import { XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useNavigate } from "react-router";

export default function ChatItem({
  id,
  isSmallScreen,
  unreadMessageNumber,
  currentContactUserId,
  setIsOpenLeftDrawer,
  updateReadlinePosition,
  deletedContactId,
}: {
  id: number;
  isSmallScreen: boolean;
  unreadMessageNumber: number;
  currentContactUserId: number | null;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  updateReadlinePosition: (contactId: number) => void;
  deletedContactId: (contactId: number) => void;
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

  function EndTouchScroll() {
    // console.log('触摸滚动结束', id);
  }

  function handleTouchStart() {
    // console.log('触摸开始', id);

  }
  function handleTouchMove() {
    // console.log('触摸移动', id);
  }

  function handleTouchEnd() {
    EndTouchScroll();
    // console.log('触摸结束', id);
  }

  function handleTouchCancel() {
    EndTouchScroll();
    // console.log('触摸被中断', id);
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

  function handleDelete(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!isSmallScreen)
      deletedContactId(id);
  }

  return (
    <button
      className={`btn btn-ghost flex justify-start w-full gap-2 ${currentContactUserId === id ? "bg-info-content/30" : ""}`}
      type="button"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={handleClick}
    >
      {/* 头像 */}
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
      { }
      <div className="flex-1 flex flex-col gap-1 justify-center min-w-0 relative">
        {/* 用户名 */}
        <div className="flex items-center ">
          <span className="truncate">
            {userInfoQuery.isLoading
              ? (
                  <div className="skeleton h-4 w-20"></div>
                )
              : (userInfo?.username || `用户${id}`)}
          </span>
        </div>
        {/* 删除联系人 */}
        <div
          className="flex items-center justify-center absolute w-6 h-6 -right-2 -top-0.5 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-200"
          onClick={handleDelete}
        >
          <XMarkICon />
        </div>
      </div>
    </button>
  );
}
