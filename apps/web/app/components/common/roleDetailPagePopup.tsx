import { ArrowLeftIcon } from "@phosphor-icons/react";
import { use, useEffect, useMemo, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { Role } from "@/components/Role/types";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import { Button } from "@/components/common/Button";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Skeleton } from "@/components/common/StatusPrimitives";
import { useGlobalUserId } from "@/components/globalContextProvider";
import CharacterDetail from "@/components/Role/CharacterDetail";
import { resolveRoleRuleSelection, shouldPersistRoleRuleSelection } from "@/utils/roleRuleSelection";
import { getRoleRule, setRoleRule } from "@/utils/roleRuleStorage";

import { useDeleteRole1Mutation } from "../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery, useGetUserRolesQuery } from "../../../api/hooks/RoleAndAvatarHooks";

function RoleDetailBackButton({ onClose }: { onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
      onClick={onClose}
    >
      返回
    </Button>
  );
}

function toRoleViewModel(roleId: number, raw: any): Role {
  return {
    id: roleId,
    name: raw?.roleName ?? "",
    description: raw?.description ?? "",
    avatar: "",
    avatarId: raw?.avatarId ?? 0,
    type: raw?.type ?? 0,
    voiceFileId: raw?.voiceFileId ?? undefined,
    extra: raw?.extra ?? {},
  };
}

export function RoleDetailPagePopup({
  roleId,
  roleTypeHint,
  roleOwnerUserIdHint,
  roleStateHint,
  allowKickOut = true,
  kickOutByManagerOnly = false,
  onClose,
}: {
  roleId: number;
  roleTypeHint?: number;
  roleOwnerUserIdHint?: number;
  roleStateHint?: number;
  allowKickOut?: boolean;
  kickOutByManagerOnly?: boolean;
  onClose: () => void;
}) {
  const roomContext = use(RoomContext);
  const roomId = roomContext?.roomId ?? -1;
  const curMember = roomContext?.curMember;

  const spaceContext = use(SpaceContext);
  const ruleIdFromSpace = spaceContext?.ruleId ?? 0;

  const shouldFetchRole = roleStateHint == null || roleStateHint === 0;
  const roleQuery = useGetRoleQuery(shouldFetchRole ? roleId : -1);
  const fetchedRole = shouldFetchRole ? roleQuery.data?.data : undefined;
  const isRoleLoading = shouldFetchRole ? roleQuery.isLoading : false;
  const isRoleMissing = !isRoleLoading && !fetchedRole;

  const storedRuleId = useMemo(() => getRoleRule(roleId), [roleId]);
  const role = useMemo(() => {
    return fetchedRole ? toRoleViewModel(roleId, fetchedRole) : null;
  }, [fetchedRole, roleId]);

  const [selectedRuleId, setSelectedRuleId] = useState<number>(() => {
    return resolveRoleRuleSelection({
      spaceRuleId: ruleIdFromSpace,
      storedRuleId,
    });
  });

  useEffect(() => {
    const nextRuleId = resolveRoleRuleSelection({
      spaceRuleId: ruleIdFromSpace,
      storedRuleId,
    });
    queueMicrotask(() => setSelectedRuleId(prev => (prev === nextRuleId ? prev : nextRuleId)));
  }, [ruleIdFromSpace, storedRuleId]);

  useEffect(() => {
    if (selectedRuleId > 0 && shouldPersistRoleRuleSelection(ruleIdFromSpace))
      setRoleRule(roleId, selectedRuleId);
  }, [roleId, ruleIdFromSpace, selectedRuleId]);

  const handleRuleChange = (newRuleId: number) => {
    setSelectedRuleId(newRuleId);
  };

  const deleteRoleMutation = useDeleteRole1Mutation();
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);

  const isManager = useMemo(() => hasHostPrivileges(curMember?.memberType), [curMember?.memberType]);

  const userId = useGlobalUserId() ?? -1;
  const userRole = useGetUserRolesQuery(userId);

  const canKick = useMemo(() => {
    if (!allowKickOut)
      return false;
    if (!roomId || roomId <= 0)
      return false;
    if (isManager)
      return true;
    if (kickOutByManagerOnly)
      return false;
    if (roleTypeHint === 2)
      return false;
    if (roleOwnerUserIdHint != null && userId > 0)
      return roleOwnerUserIdHint === userId;
    const ownRole = Boolean(userRole.data?.data?.find(r => r.roleId === roleId));
    return ownRole;
  }, [allowKickOut, isManager, kickOutByManagerOnly, roleId, roleOwnerUserIdHint, roleTypeHint, roomId, userId, userRole.data?.data]);

  const handleRemoveRole = () => {
    if (!roomId || roomId <= 0) {
      appToast.error("房间信息异常，无法踢出角色");
      return;
    }
    deleteRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSuccess: () => {
          appToast.success("已将角色从房间移除");
        },
        onError: (e: any) => {
          console.error("踢出角色失败", e);
          appToast.error(e?.message ? `踢出角色失败：${e.message}` : "踢出角色失败");
        },
        onSettled: () => {
          setIsKickConfirmOpen(false);
          onClose();
        },
      },
    );
  };

  // 用于踢出确认文案的角色与房间显示
  const roleDisplayName = role?.name || `角色 ${roleId}`;
  const roomDisplayName = roomId > 0 ? `房间 ${roomId}` : "当前房间";

  if (!role && !isRoleMissing) {
    return (
      <div className="bg-base-100 w-full">
        <div className="p-6">
          <RoleDetailBackButton onClose={onClose} />
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-4 w-52 mb-6" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (isRoleMissing) {
    return (
      <div className="bg-base-100 flex flex-col gap-3 w-240 max-w-[90vw]">
        <div className="px-2 pt-2">
          <RoleDetailBackButton onClose={onClose} />
        </div>
        <div className={surfaceClassName({ level: "content", className: "border-base-200 p-4 shadow-sm" })}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">
                  角色已删除或不可用
                </div>
                <div className="text-xs text-base-content/60 mt-1">
                  角色ID：
                  {" "}
                  {roleId}
                </div>
              </div>
              {canKick && (
                <Button
                  variant="error"
                  size="xs"
                  className="sm:h-8 sm:min-h-8 sm:px-3"
                  onClick={() => setIsKickConfirmOpen(true)}
                  aria-label={`踢出角色 ID ${roleId}（${roomDisplayName}）`}
                >
                  踢出角色
                </Button>
              )}
            </div>
            <div className="text-sm text-base-content/70">
              无法加载角色详情，但仍可将其从当前房间移除。
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={isKickConfirmOpen}
          onOpenChange={() => setIsKickConfirmOpen(false)}
          title="确认踢出角色"
          description={`确定要将角色 ID ${roleId}从${roomDisplayName}移除吗？此操作会解除该角色与${roomDisplayName}的关联，房间内基于该角色的内容将不再生效。`}
          onConfirm={handleRemoveRole}
          confirmLabel="确认踢出"
          cancelLabel="取消"
          variant="warning"
        />
      </div>
    );
  }

  if (!role) {
    return null;
  }

  return (
    <div className="bg-base-100 flex flex-col gap-3 w-240 max-w-[90vw]">
      <div className="px-2 pt-2">
        <RoleDetailBackButton onClose={onClose} />
      </div>
      <CharacterDetail
        role={role}
        onSave={() => {}}
        selectedRuleId={selectedRuleId}
        onRuleChange={handleRuleChange}
        layout="popup"
        canKickOut={canKick}
        onKickOut={() => setIsKickConfirmOpen(true)}
      />

      <ConfirmDialog
        open={isKickConfirmOpen}
        onOpenChange={() => setIsKickConfirmOpen(false)}
        title="确认踢出角色"
        description={`确定要将角色「${roleDisplayName}」从${roomDisplayName}移除吗？此操作会解除该角色与${roomDisplayName}的关联，房间内基于该角色的内容将不再生效。`}
        onConfirm={handleRemoveRole}
        confirmLabel="确认踢出"
        cancelLabel="取消"
        variant="warning"
      />
    </div>
  );
}
