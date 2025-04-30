import { RoomContext } from "@/components/chat/roomContext";
import { PopWindow } from "@/components/common/popWindow";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import { use, useState } from "react";
import { useParams } from "react-router";

import {
  useDeleteRoomMemberMutation,
  useDeleteSpaceMemberMutation,
  useGetSpaceMembersQuery,
  useRevokePlayerMutation,
  useSetPlayerMutation,
  useTransferOwnerMutation,
} from "../../../api/hooks/chatQueryHooks";
import {
  useGetUserInfoQuery,
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

export default function UserAvatarComponent({ userId, width, isRounded, withName = false, stopPopWindow = false }: {
  userId: number;
  width: keyof typeof sizeMap; // 头像的宽度
  isRounded: boolean; // 是否是圆的
  withName?: boolean; // 是否显示名字
  stopPopWindow?: boolean; // 点击后是否会产生userDetail弹窗
}) {
  const userQuery = useGetUserInfoQuery(userId);
  // 控制用户详情的popWindow
  const [isOpen, setIsOpen] = useState(false);
  const { spaceId: urlSpaceId } = useParams();
  const spaceId = Number(urlSpaceId);
  const spaceMembers = useGetSpaceMembersQuery(spaceId).data?.data ?? [];
  // userId()是当前组件显示的用户，member是userId对应的member
  const member = spaceMembers.find(member => member.userId === userId);

  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  // 当前登录用户的id
  const curUserId = useGlobalContext().userId ?? -1;

  const mutateRoomMember = useDeleteRoomMemberMutation();
  const mutateSpaceMember = useDeleteSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();
  const revokePlayerMutation = useRevokePlayerMutation();
  const transferOwnerMutation = useTransferOwnerMutation();

  // 是否是群主
  function isManager() {
    const curMember = spaceMembers.find(member => member.userId === curUserId);
    return (curMember?.memberType ?? -1) === 1;
  }

  const handleRemoveMember = async () => {
    if (roomId > 0) {
      mutateRoomMember.mutate(
        { roomId, userIdList: [userId] },
        {
          onSettled: () => setIsOpen(false), // 最终关闭弹窗
        },
      );
    }
    if (spaceId > 0) {
      mutateSpaceMember.mutate(
        { spaceId, userIdList: [userId] },
        {
          onSettled: () => setIsOpen(false),
        },
      );
    }
  };

  function handleSetPlayer() {
    setPlayerMutation.mutate({
      spaceId,
      uidList: [userId],
    }, {
      onSettled: () => setIsOpen(false),
    });
  }

  function handRevokePlayer() {
    revokePlayerMutation.mutate({
      spaceId,
      uidList: [userId],
    }, {
      onSettled: () => setIsOpen(false),
    });
  }

  function handTransferRoomOwner() {
    transferOwnerMutation.mutate({
      spaceId,
      newOwnerId: userId,
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
                  (spaceId > 0) && (
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
                              <button type="button" className="btn btn-info" onClick={handTransferRoomOwner}>
                                转让KP
                              </button>
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
