import { AddressBookIcon, UsersIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, use, useMemo, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import MemberLists from "@/components/chat/shared/components/memberLists";
import { canManageMemberPermissions, canManageRoomRoles, canViewRoomNpcRoles, hasHostPrivileges } from "@/components/chat/utils/memberPermissions";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import { Button } from "@/components/common/Button";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { panelSwapMotionProps } from "@/components/common/motion/listItemMotion";
import { StateView } from "@/components/common/StateView";
import { Divider } from "@/components/common/StatusPrimitives";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { getScreenSize } from "@/utils/getScreenSize";

import { useAddRoomMemberMutation, useAddRoomRoleMutation } from "../../../../../api/hooks/chatQueryHooks";
import RoleList from "../../shared/components/roleLists";

const LazyAddRoleWindow = lazy(async () => {
  const module = await import("../../window/addRoleWindow");
  return { default: module.AddRoleWindow };
});

const LazyAddNpcRoleWindow = lazy(async () => {
  const module = await import("../../window/addNpcRoleWindow");
  return { default: module.AddNpcRoleWindow };
});

function showMutationError(error: unknown, fallbackMessage: string) {
  appToast.error(error instanceof Error && error.message ? error.message : fallbackMessage);
}

export default function RoomUserList({ type}: { type: string }) {
  const isRole = type === "Role";

  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext.roomId ?? -1;
  const members = roomContext.roomMembers;
  const spaceMembers = spaceContext.spaceMembers;
  const visibleMembers = spaceMembers.length > 0 ? spaceMembers : members;
  const roomMemberUserIds = useMemo(() => members.map(member => member.userId).filter((userId): userId is number => typeof userId === "number"), [members]);
  // 全局登录用户对应的member
  const curMember = roomContext.curMember;
  const currentMemberType = curMember?.memberType;
  const hasHostAccess = hasHostPrivileges(currentMemberType);
  const canInviteMembers = canManageMemberPermissions(currentMemberType);
  const canAddRole = canManageRoomRoles(currentMemberType);
  const canViewNpcRoles = canViewRoomNpcRoles(currentMemberType);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("memberSettingPop", false);

  const addMemberMutation = useAddRoomMemberMutation();

  async function handleAddMember(userId: number) {
    addMemberMutation.mutate({
      roomId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        setIsMemberHandleOpen(false);
        appToast.success("添加成员成功");
      },
      onError: error => showMutationError(error, "添加成员失败"),
    });
  }

  const allRoomRoles = roomContext.roomAllRoles;
  const roomRoles = useMemo(
    () => (allRoomRoles ?? []).filter(role => role.type !== 2),
    [allRoomRoles],
  );
  const npcRoles = useMemo(
    () => canViewNpcRoles ? (allRoomRoles ?? []).filter(role => role.type === 2) : [],
    [allRoomRoles, canViewNpcRoles],
  );

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState<boolean>(false);
  const [isNpcRoleHandleOpen, setIsNpcRoleHandleOpen] = useState<boolean>(false);

  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSuccess: () => {
          appToast.success("添加角色成功");
        },
        onError: error => showMutationError(error, "添加角色失败"),
      },
    );
  };

  const handleAddNpcRole = async (roleId: number) => {
    addRoleMutation.mutate(
      { roomId, roleIdList: [roleId] },
      {
        onSuccess: () => {
          appToast.success("添加NPC成功");
        },
        onError: error => showMutationError(error, "添加NPC失败"),
      },
    );
  };

  return (
    <div className="h-full min-h-0 p-2 flex flex-col items-stretch">
      <div className="
        flex flex-row justify-between items-center gap-2 w-full mt-2
      ">
        <div className="flex items-center gap-2">
          {isRole
            ? (
                <>
                  <AddressBookIcon className="size-5" />
                  <p className="text-start font-semibold">
                    角色列表-
                    {roomRoles.length + npcRoles.length}
                  </p>
                </>
              )
            : (
                <>
                  <UsersIcon className="inline size-5" />
                  <p className="text-start font-semibold">
                    空间成员-
                    {visibleMembers.length}
                  </p>
                  {visibleMembers.length !== members.length && (
                    <span className="text-xs text-base-content/50">
                      房间内
                      {" "}
                      {members.length}
                    </span>
                  )}
                </>
              )}
        </div>

        <div className="flex gap-2">
          {!isRole && canInviteMembers && (
            <Button
              variant="outline"
              className="border-dashed border-info/45 text-info hover:border-info/70 hover:bg-info/10"
              onClick={() => setIsMemberHandleOpen(true)}
            >
              添加成员
            </Button>
          )}
          {isRole && canAddRole && (
            <Button
              variant="outline"
              size="xs"
              className="border-dashed border-info/45 text-info hover:border-info/70 hover:bg-info/10"
              onClick={() => setIsRoleHandleOpen(true)}
            >
              角色+
            </Button>
          )}
          {isRole && hasHostAccess && (
            <Button
              variant="outline"
              size="xs"
              className="border-dashed border-info/45 text-info hover:border-info/70 hover:bg-info/10"
              onClick={() => setIsNpcRoleHandleOpen(true)}
            >
              NPC+
            </Button>
          )}
        </div>
      </div>
      <Divider />

      <div
        className="
          flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full flex flex-col
          items-stretch gap-2
        "
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isRole ? "roles" : "members"}
            className="flex w-full flex-col items-stretch gap-2"
            {...panelSwapMotionProps}
          >
            {isRole
              ? (
                  <>
                    <RoleList roles={roomRoles} className={getScreenSize() === "sm" ? `
                      w-full
                    ` : `w-full max-w-md`} sourceRoomId={roomId} />
                    <RoleList
                      roles={npcRoles}
                      className={getScreenSize() === "sm" ? "w-full" : `
                        w-full max-w-md
                      `}
                      isNpcRole={true}
                      allowKickOut={true}
                      kickOutByManagerOnly={true}
                      sourceRoomId={roomId}
                    />
                  </>
                )
              : (
                  <MemberLists
                    members={visibleMembers}
                    className={getScreenSize() === "sm" ? "w-full" : `
                      w-full max-w-md
                    `}
                    isSpace={false}
                    roomMemberUserIds={roomMemberUserIds}
                  />
                )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ToastWindow
        isOpen={canInviteMembers && isMemberHandleOpen}
        onClose={() => setIsMemberHandleOpen(false)}
        disableScroll={true}
        panelClassName="!max-w-none !p-0 overflow-hidden rounded-lg border border-base-300/70 shadow-2xl"
      >
        <AddMemberWindow handleAddMember={handleAddMember} showSpace={true} inviteCodeType={1} />
      </ToastWindow>
      {/* 弹窗 */}
      <ToastWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        {isRoleHandleOpen && (
          <Suspense fallback={<RoomUserListToastFallback />}>
            <LazyAddRoleWindow handleAddRole={handleAddRole} />
          </Suspense>
        )}
      </ToastWindow>
      <ToastWindow isOpen={isNpcRoleHandleOpen} onClose={() => setIsNpcRoleHandleOpen(false)}>
        {isNpcRoleHandleOpen && (
          <Suspense fallback={<RoomUserListToastFallback />}>
            <LazyAddNpcRoleWindow handleAddRole={handleAddNpcRole} />
          </Suspense>
        )}
      </ToastWindow>
    </div>
  );
}

function RoomUserListToastFallback() {
  return <StateView loading className="min-h-40 w-full py-0" />;
}
