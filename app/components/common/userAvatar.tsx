import { GroupContext } from "@/components/chat/GroupContext";
import { PopWindow } from "@/components/common/popWindow";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import { use, useState } from "react";
import {
  useDeleteMemberMutation,
  useGetUserInfoQuery,
  useRevokePlayerMutation,
  useSetPlayerMutation,
} from "../../../api/queryHooks";

// 如果是 import 的sizeMap 就不能在className中用了, 于是复制了一份, 够丑的 :(
const sizeMap = {
  6: "w-6 h-6", // 24px
  8: "w-8 h-8", // 32px
  10: "w-10 h-10", // 40px
  12: "w-12 h-12", // 48px
  18: "w-18 h-18", // 72px
  20: "w-20 h-20", // 80px
  24: "w-24 h-24", // 96px
  30: "w-30 h-30", // 120px
  32: "w-32 h-32", // 128px
  36: "w-36 h-36", // 144px
} as const;

export default function UserAvatarComponent({ userId, width, isRounded, withName = false, stopPopWindow = false }: { userId: number; width: keyof typeof sizeMap; isRounded: boolean; withName: boolean; stopPopWindow?: boolean }) {
  const userQuery = useGetUserInfoQuery(userId);
  // 控制用户详情的popWindow
  const [isOpen, setIsOpen] = useState(false);

  const groupContext = use(GroupContext);
  const groupId = groupContext.groupId ?? -1;
  const groupMembers = groupContext.groupMembers ?? [];
  // userId()是当前组件显示的用户，member是userId对应的member
  const member = groupMembers.find(member => member.userId === userId);
  // 当前登录用户的id
  const curUserId = useGlobalContext().userId ?? -1;

  const mutateMember = useDeleteMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();
  const revokePlayerMutation = useRevokePlayerMutation();

  // 是否是群主
  function isManager() {
    return groupId >= 0 && groupMembers.some(member => member.userId === curUserId && member.memberType === 1);
  }

  const handleRemoveMember = async () => {
    if (groupId < 0)
      return;
    mutateMember.mutate(
      { roomId: groupId, userIdList: [userId] },
      {
        onSettled: () => setIsOpen(false), // 最终关闭弹窗
      },
    );
  };

  function handleSetPlayer() {
    setPlayerMutation.mutate({
      roomId: groupId,
      uidList: [userId],
    }, {
      onSettled: () => setIsOpen(false),
    });
  }

  function handRevokePlayer() {
    revokePlayerMutation.mutate({
      roomId: groupId,
      uidList: [userId],
    }, {
      onSettled: () => setIsOpen(false),
    });
  }

  return (
    <>
      <div className="avatar">
        <div className={`${sizeMap[width]} rounded${isRounded ? "-full" : ""}`}>
          <img
            src={userQuery.isPending || userQuery.error || !userQuery.data?.data?.avatar ? undefined : userQuery.data?.data?.avatar}
            alt="Avatar"
            className="hover:scale-110 transition-transform"
            onClick={() => setIsOpen(true)}
          />
        </div>
      </div>
      {
        withName && (
          <div
            className={`text-sm ${(userQuery.data?.data?.username ?? "").length > 5 ? "truncate max-w-[7em]" : ""}`}
          >
            {userQuery.data?.data?.username}
          </div>
        )
      }
      <div className="absolute">
        {
          (isOpen && !stopPopWindow) && (
            <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <div className="items-center justify-center gap-y-4 flex flex-col">
                <UserDetail userId={userId}></UserDetail>
                {
                  (groupId >= 0) && (
                    curUserId === userId
                      ? (
                          <div className="gap-4 flex">
                            <button type="button" className="btn btn-error" onClick={handleRemoveMember}>
                              退出群聊
                            </button>
                          </div>
                        )
                      : (
                          (isManager())
                          && (
                            <div className="gap-4 flex">
                              <button type="button" className="btn btn-error" onClick={handleRemoveMember}>
                                踢出成员
                              </button>
                              {
                                ((member?.memberType ?? -1) === 3) && (
                                  <button type="button" className="btn btn-info" onClick={handleSetPlayer}>
                                    设为玩家
                                  </button>
                                )
                              }
                              {
                                ((member?.memberType ?? -1) === 2) && (
                                  <button type="button" className="btn btn-info" onClick={handRevokePlayer}>
                                    撤销成员身份
                                  </button>
                                )
                              }
                            </div>
                          )
                        )
                  )
                }
              </div>
            </PopWindow>
          )
        }
      </div>
    </>
  );
}
