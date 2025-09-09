import type { RoomMember, SpaceMember } from "../../../../api";
import { RoomContext } from "@/components/chat/roomContext";
import { MemberTypeTag } from "@/components/chat/smallComponents/memberTypeTag";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { use, useCallback } from "react";
import { useParams } from "react-router";
import {
  useDeleteRoomMemberMutation,
  useDeleteSpaceMemberMutation,
  useGetSpaceMembersQuery,
  useRevokePlayerMutation,
  useSetPlayerMutation,
  useTransferLeader,
} from "../../../../api/hooks/chatQueryHooks";

// 统一的按钮组件（可根据需要拆分）
function ActionButtons({
  member,
  spaceId,
  isManager,
  curUserId,
  onRemove,
  onSetPlayer,
  onRevokePlayer,
  onTransfer,
}: {
  member: RoomMember | SpaceMember;
  spaceId: number;
  isManager: boolean;
  curUserId: number;
  onRemove: () => void;
  onSetPlayer: () => void;
  onRevokePlayer: () => void;
  onTransfer: () => void;
}) {
  if (spaceId <= 0)
    return null;
  // 自己 -> 退出
  if (curUserId === member.userId) {
    return (
      <div className="gap-4 flex justify-center pt-2">
        <button type="button" className="btn btn-error btn-xs" onClick={onRemove}>退出群聊</button>
      </div>
    );
  }
  // 管理员对别人
  if (isManager) {
    return (
      <div className="gap-2 flex flex-wrap justify-center pt-2">
        <button type="button" className="btn btn-error btn-xs" onClick={onRemove}>踢出成员</button>
        {((member?.memberType ?? -1) === 3) && (
          <button type="button" className="btn btn-info btn-xs" onClick={onSetPlayer}>设为玩家</button>
        )}
        {((member?.memberType ?? -1) === 2) && (
          <button type="button" className="btn btn-info btn-xs" onClick={onRevokePlayer}>撤销成员身份</button>
        )}
        <button type="button" className="btn btn-info btn-xs" onClick={onTransfer}>转让KP</button>
      </div>
    );
  }
  return null;
}

export default function MemberLists({ members, className }: { members: (RoomMember | SpaceMember)[]; className?: string }) {
  // 获取上下文与全局信息
  const { spaceId: urlSpaceId } = useParams();
  const spaceId = Number(urlSpaceId);
  const globalCtx = useGlobalContext();
  const curUserId = globalCtx.userId ?? -1;
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  // 查询成员列表（用于判断当前用户权限）
  const spaceMembers = useGetSpaceMembersQuery(spaceId).data?.data ?? [];
  const curMember = spaceMembers.find(m => m.userId === curUserId);
  const isManager = (curMember?.memberType ?? -1) === 1;

  // mutations
  const mutateRoomMember = useDeleteRoomMemberMutation();
  const mutateSpaceMember = useDeleteSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();
  const revokePlayerMutation = useRevokePlayerMutation();
  const transferLeader = useTransferLeader();

  const buildHandlers = useCallback((member: RoomMember | SpaceMember) => {
    const onRemove = () => {
      if (roomId > 0) {
        mutateRoomMember.mutate({ roomId, userIdList: [member.userId ?? 0] });
      }
      else if (spaceId > 0) {
        mutateSpaceMember.mutate({ spaceId, userIdList: [member.userId ?? 0] });
      }
    };
    const onSetPlayer = () => setPlayerMutation.mutate({ spaceId, uidList: [member.userId ?? 0] });
    const onRevokePlayer = () => revokePlayerMutation.mutate({ spaceId, uidList: [member.userId ?? 0] });
    const onTransfer = () => transferLeader.mutate({ spaceId, newLeaderId: member.userId ?? 0 });
    return { onRemove, onSetPlayer, onRevokePlayer, onTransfer };
  }, [roomId, spaceId, mutateRoomMember, mutateSpaceMember, setPlayerMutation, revokePlayerMutation, transferLeader]);

  return (
    <div className="flex flex-col gap-2">
      {members.sort((a, b) => (a.memberType ?? 99) - (b.memberType ?? 99)).map((member) => {
        const { onRemove, onSetPlayer, onRevokePlayer, onTransfer } = buildHandlers(member);
        return (
          <div className={`bg-base-200 p-3 rounded-lg ${className ?? ""}`} key={member.userId}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-row gap-3 items-center">
                <UserAvatarComponent userId={member.userId ?? 0} width={10} isRounded={true} withName={true} />
              </div>
              <MemberTypeTag memberType={member.memberType} />
            </div>
            <ActionButtons
              member={member}
              spaceId={spaceId}
              isManager={isManager}
              curUserId={curUserId}
              onRemove={onRemove}
              onSetPlayer={onSetPlayer}
              onRevokePlayer={onRevokePlayer}
              onTransfer={onTransfer}
            />
          </div>
        );
      })}
    </div>
  );
};
