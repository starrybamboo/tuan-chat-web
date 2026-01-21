import type { Role } from "@/components/Role/types";

import { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ConfirmModal from "@/components/common/comfirmModel";
import { useGlobalContext } from "@/components/globalContextProvider";
import CharacterDetail from "@/components/Role/CharacterDetail";
import { useDeleteRole1Mutation } from "../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery, useGetUserRolesQuery } from "../../../api/hooks/RoleAndAvatarHooks";
import { getRoleRule, setRoleRule } from "@/utils/roleRuleStorage";

function toRoleViewModel(roleId: number, raw: any): Role {
  return {
    id: roleId,
    name: raw?.roleName ?? "",
    description: raw?.description ?? "",
    avatar: "",
    avatarId: raw?.avatarId ?? 0,
    type: raw?.type ?? 0,
    modelName: raw?.modelName ?? "",
    speakerName: raw?.speakerName ?? "",
    voiceUrl: raw?.voiceUrl ?? undefined,
    extra: raw?.extra ?? {},
  };
}

export function RoleDetailPagePopup({
  roleId,
  allowKickOut = true,
  onClose,
}: {
  roleId: number;
  allowKickOut?: boolean;
  onClose: () => void;
}) {
  const roomContext = use(RoomContext);
  const roomId = roomContext?.roomId ?? -1;
  const curMember = roomContext?.curMember;

  const spaceContext = use(SpaceContext);
  const ruleIdFromSpace = spaceContext?.ruleId ?? 0;

  const roleQuery = useGetRoleQuery(roleId);
  const fetchedRole = roleQuery.data?.data;

  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!fetchedRole)
      return;
    setRole(toRoleViewModel(roleId, fetchedRole));
  }, [fetchedRole, roleId]);

  const [selectedRuleId, setSelectedRuleId] = useState<number>(() => {
    const stored = getRoleRule(roleId);
    return stored || (ruleIdFromSpace > 0 ? ruleIdFromSpace : 1);
  });

  useEffect(() => {
    if (selectedRuleId > 0)
      setRoleRule(roleId, selectedRuleId);
  }, [roleId, selectedRuleId]);

  const handleRuleChange = (newRuleId: number) => {
    setSelectedRuleId(newRuleId);
    setRoleRule(roleId, newRuleId);
  };

  const handleSave = (updatedRole: Role) => {
    setRole(updatedRole);
  };

  const deleteRoleMutation = useDeleteRole1Mutation();
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);

  const isManager = useMemo(() => curMember?.memberType === 1, [curMember?.memberType]);

  const userId = useGlobalContext().userId ?? -1;
  const userRole = useGetUserRolesQuery(userId);

  const canKick = useMemo(() => {
    if (!allowKickOut)
      return false;
    if (!roomId || roomId <= 0)
      return false;
    const ownRole = Boolean(userRole.data?.data?.find(r => r.roleId === roleId));
    return Boolean(isManager || ownRole);
  }, [allowKickOut, isManager, roleId, roomId, userRole.data?.data]);

  const handleRemoveRole = () => {
    if (!roomId || roomId <= 0) {
      toast.error("房间信息异常，无法踢出角色");
      return;
    }
    deleteRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSuccess: () => {
          toast.success("已将角色从房间移除");
        },
        onError: (e: any) => {
          console.error("踢出角色失败", e);
          toast.error(e?.message ? `踢出角色失败：${e.message}` : "踢出角色失败");
        },
        onSettled: () => {
          setIsKickConfirmOpen(false);
          onClose();
        },
      },
    );
  };

  if (!role) {
    return (
      <div className="bg-base-100 w-full">
        <div className="p-6">
          <div className="skeleton h-6 w-40 mb-4" />
          <div className="skeleton h-4 w-64 mb-2" />
          <div className="skeleton h-4 w-52 mb-6" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 flex flex-col gap-3 w-full">
      <div className="flex items-center justify-end gap-2 px-2 pt-2">
        {canKick && (
          <button
            type="button"
            className="btn btn-error btn-xs sm:btn-sm"
            onClick={() => setIsKickConfirmOpen(true)}
          >
            踢出角色
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-xs sm:btn-sm"
          onClick={onClose}
        >
          关闭
        </button>
      </div>

      <CharacterDetail
        role={role}
        onSave={handleSave}
        selectedRuleId={selectedRuleId}
        onRuleChange={handleRuleChange}
      />

      <ConfirmModal
        isOpen={isKickConfirmOpen}
        onClose={() => setIsKickConfirmOpen(false)}
        title="确认踢出角色"
        message="确定要将该角色从当前房间移除吗？此操作将解除该角色与房间的关联。"
        onConfirm={handleRemoveRole}
        confirmText="确认踢出"
        cancelText="取消"
        variant="warning"
      />
    </div>
  );
}
