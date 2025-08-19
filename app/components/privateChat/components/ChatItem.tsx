import { XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useGetUserInfoQuery } from "api/queryHooks";
import { useNavigate } from "react-router";

export default function FriendItem({
  id,
  isDeleteContats,
  unreadMessageNumber,
  currentContactUserId,
  setIsOpenLeftDrawer,
  updateReadlinePosition,
  deletedContactId,
}: {
  id: number;
  isDeleteContats: boolean;
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

  return (
    <button
      className={`btn btn-ghost flex justify-start w-full gap-2 ${currentContactUserId === id ? "bg-info-content/30" : ""}`}
      type="button"
      onClick={() => {
        navigate(`/chat/private/${id}`);
        updateReadlinePosition(id);
        if (getScreenSize() === "sm") {
          setTimeout(() => {
            setIsOpenLeftDrawer(false);
          }, 0);
        }
      }}
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
        {isDeleteContats && (
          <div
            className="flex items-center justify-center absolute w-6 h-6 -right-2 -top-0.5 rounded-2xl bg-white transition-opacity duration-200"
            onClick={(e) => {
              e.stopPropagation();
              deletedContactId(id);
            }}
          >
            <XMarkICon />
          </div>
        )}
      </div>
    </button>
  );
}
