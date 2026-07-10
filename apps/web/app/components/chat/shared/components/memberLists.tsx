import type { Ref } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { MemberTypeTag } from "@/components/chat/message/types/memberTypeTag";
import {
  getMemberTypeSortWeight,
  hasHostPrivileges,
  SPACE_MEMBER_TYPE,
} from "@/components/chat/utils/memberPermissions";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { useGlobalUserId } from "@/components/globalContextProvider";

import type { SpaceMember } from "../../../../../api";

import {

  useAddRoomMemberMutation,
  useDeleteRoomMemberMutation,
  useDeleteSpaceMemberMutation,
  useTransferLeader,
  useUpdateSpaceMemberTypeMutation,
} from "../../../../../api/hooks/chatQueryHooks";

function getSpaceMemberTypeActions(memberType?: number | null): Array<{ memberType: number; label: string }> {
  const actions: Array<{ memberType: number; label: string }> = [];
  if (memberType !== SPACE_MEMBER_TYPE.ASSISTANT_LEADER) {
    actions.push({ memberType: SPACE_MEMBER_TYPE.ASSISTANT_LEADER, label: "设为副GM/KP" });
  }
  if (memberType !== SPACE_MEMBER_TYPE.PLAYER) {
    actions.push({ memberType: SPACE_MEMBER_TYPE.PLAYER, label: "设为PL" });
  }
  if (memberType !== SPACE_MEMBER_TYPE.OBSERVER) {
    actions.push({ memberType: SPACE_MEMBER_TYPE.OBSERVER, label: "设为OB" });
  }
  return actions;
}

export function resolveRoomMemberAction({
  canManageRoomMembership,
  currentUserId,
  isRoomMember,
  memberUserId,
}: {
  canManageRoomMembership: boolean;
  currentUserId: number;
  isRoomMember: boolean;
  memberUserId?: number | null;
}): { danger: boolean; label: string; kind: "invite" | "remove" } | null {
  const isSelf = currentUserId === memberUserId;
  const canLeaveRoom = isSelf && isRoomMember;
  const canRemoveRoomMember = isRoomMember && canManageRoomMembership && !isSelf;
  const canInviteToRoom = !isRoomMember && canManageRoomMembership && !isSelf;

  if (!canLeaveRoom && !canRemoveRoomMember && !canInviteToRoom) {
    return null;
  }

  if (canInviteToRoom) {
    return { danger: false, kind: "invite", label: "邀请" };
  }

  return {
    danger: true,
    kind: "remove",
    label: canLeaveRoom ? "退出" : "移除",
  };
}

export function splitMemberGroups({
  isSpace,
  members,
  roomMemberUserIds,
}: {
  isSpace: boolean;
  members: SpaceMember[];
  roomMemberUserIds?: number[];
}): { roomMembers: SpaceMember[]; shouldSplit: boolean; spaceMembers: SpaceMember[] } {
  if (isSpace || roomMemberUserIds == null) {
    return {
      roomMembers: members,
      shouldSplit: false,
      spaceMembers: [],
    };
  }

  const roomMemberUserIdSet = new Set(roomMemberUserIds);
  return {
    roomMembers: members.filter(member => roomMemberUserIdSet.has(member.userId ?? -1)),
    shouldSplit: true,
    spaceMembers: members.filter(member => !roomMemberUserIdSet.has(member.userId ?? -1)),
  };
}

export function getSpaceMemberMenuLabels({
  canLeaveSpace,
  canManageSpaceTarget,
  memberType,
}: {
  canLeaveSpace: boolean;
  canManageSpaceTarget: boolean;
  memberType?: number | null;
}): string[] {
  const labels: string[] = [];
  if (canLeaveSpace) {
    labels.push("退出空间");
  }
  if (canManageSpaceTarget) {
    labels.push(...getSpaceMemberTypeActions(memberType).map(action => action.label));
    labels.push("转让GM/KP", "移出空间");
  }
  return labels;
}

function MemberActionMenuItem({
  label,
  ariaLabel,
  onClick,
  onAfterClick,
  danger = false,
  first = false,
  firstItemRef,
}: {
  label: string;
  ariaLabel?: string;
  onClick: () => void;
  onAfterClick: () => void;
  danger?: boolean;
  first?: boolean;
  firstItemRef: Ref<HTMLButtonElement>;
}) {
  return (
    <li>
      <button
        ref={first ? firstItemRef : undefined}
        type="button"
        className={`
          justify-start w-full text-left
          ${danger ? `
            text-error
            hover:text-error
          ` : ""}
        `}
        onClick={() => {
          onClick();
          onAfterClick();
        }}
        role="menuitem"
        aria-label={ariaLabel ?? label}
      >
        {label}
      </button>
    </li>
  );
}

function RoomMemberActionButton({
  member,
  isRoomMember,
  canManageRoomMembership,
  curUserId,
  onRemove,
  onInvite,
}: {
  member: SpaceMember;
  isRoomMember: boolean;
  canManageRoomMembership: boolean;
  curUserId: number;
  onRemove: () => void;
  onInvite: () => void;
}) {
  const action = resolveRoomMemberAction({
    canManageRoomMembership,
    currentUserId: curUserId,
    isRoomMember,
    memberUserId: member.userId,
  });

  if (!action) {
    return null;
  }

  return (
    <button
      type="button"
      className={`
        btn btn-xs btn-ghost px-2
        ${action.danger ? "text-error" : `text-info`}
      `}
      onClick={action.kind === "invite" ? onInvite : onRemove}
      aria-label={action.label}
    >
      {action.label}
    </button>
  );
}

function SpaceMemberActionMenu({
  member,
  canManageSpaceMemberPermissions,
  curUserId,
  onRemove,
  onTransfer,
  onUpdateMemberType,
  spaceMemberTypeActions,
}: {
  member: SpaceMember;
  canManageSpaceMemberPermissions: boolean;
  curUserId: number;
  onRemove: () => void;
  onTransfer: () => void;
  onUpdateMemberType: (memberType: number) => void;
  spaceMemberTypeActions: Array<{ memberType: number; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [placeUp, setPlaceUp] = useState(true);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  const isSelf = curUserId === member.userId;
  const canLeaveSpace = isSelf;
  const canManageSpaceTarget = canManageSpaceMemberPermissions && !isSelf;
  const menuLabels = getSpaceMemberMenuLabels({
    canLeaveSpace,
    canManageSpaceTarget,
    memberType: member.memberType,
  });
  const shouldHide = menuLabels.length === 0;

  const closeMenuAndRefocus = useCallback(() => {
    setOpen(false);
    triggerBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.isComposing)
        return;
      if (e.key === "Escape") {
        setOpen(false);
        triggerBtnRef.current?.focus();
      }
      if (e.key === "ArrowDown" && firstItemRef.current) {
        e.preventDefault();
        firstItemRef.current.focus();
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const triggerRect = triggerBtnRef.current?.getBoundingClientRect();
    requestAnimationFrame(() => {
      if (!triggerRect) {
        return;
      }
      const viewportH = window.innerHeight;
      const menuHeight = 220;
      const spaceBelow = viewportH - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      let nextPlaceUp = true;
      if (spaceAbove < menuHeight + 20) {
        nextPlaceUp = spaceBelow >= menuHeight + 20 ? false : spaceAbove > spaceBelow;
      }

      setPlaceUp(nextPlaceUp);
    });
    if (firstItemRef.current) {
      requestAnimationFrame(() => firstItemRef.current?.focus());
    }
  }, [open]);

  if (shouldHide) {
    return null;
  }

  const memberName = member.username ?? `用户 ${member.userId ?? ""}`;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={triggerBtnRef}
        type="button"
        className="btn btn-ghost btn-xs px-2"
        onClick={() => setOpen(openState => !openState)}
        aria-label={`更多 ${memberName} 的成员操作`}
        aria-expanded={open}
        aria-controls={`member-menu-${member.userId}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <ul
          id={`member-menu-${member.userId}`}
          className={`
            menu menu-xs dropdown-content absolute right-0 z-20 max-h-60 w-48
            overflow-auto rounded-box bg-base-200 p-2 shadow animate-fadeIn
            ${placeUp ? `bottom-full mb-1 origin-bottom` : `
              top-full mt-1 origin-top
            `}
          `}
          role="menu"
          aria-label="成员操作菜单"
        >
          {menuLabels.includes("退出空间") && (
            <MemberActionMenuItem
              first={true}
              firstItemRef={firstItemRef}
              label="退出空间"
              ariaLabel={`让 ${memberName} 退出空间`}
              onClick={onRemove}
              onAfterClick={closeMenuAndRefocus}
              danger={true}
            />
          )}
          {canManageSpaceTarget && (
            <>
              {spaceMemberTypeActions.map((action, index) => (
                <MemberActionMenuItem
                  key={`${member.userId}-${action.memberType}`}
                  first={index === 0 && !canLeaveSpace}
                  firstItemRef={firstItemRef}
                  label={action.label}
                  ariaLabel={`将 ${memberName} ${action.label}`}
                  onClick={() => onUpdateMemberType(action.memberType)}
                  onAfterClick={closeMenuAndRefocus}
                />
              ))}
              <MemberActionMenuItem firstItemRef={firstItemRef} label="转让GM/KP" ariaLabel={`将 GM/KP 转让给 ${memberName}`} onClick={onTransfer} onAfterClick={closeMenuAndRefocus} />
              <MemberActionMenuItem firstItemRef={firstItemRef} label="移出空间" ariaLabel={`将 ${memberName} 移出空间`} onClick={onRemove} onAfterClick={closeMenuAndRefocus} danger={true} />
            </>
          )}
        </ul>
      )}
    </div>
  );
}

function ActionButtons({
  member,
  isRoomMember,
  isSpace,
  canManageRoomMembership,
  canManageSpaceMemberPermissions,
  curUserId,
  onRemove,
  onInvite,
  onTransfer,
  onUpdateMemberType,
  spaceMemberTypeActions,
}: {
  member: SpaceMember;
  isRoomMember: boolean;
  isSpace: boolean;
  canManageRoomMembership: boolean;
  canManageSpaceMemberPermissions: boolean;
  curUserId: number;
  onRemove: () => void;
  onInvite: () => void;
  onTransfer: () => void;
  onUpdateMemberType: (memberType: number) => void;
  spaceMemberTypeActions: Array<{ memberType: number; label: string }>;
}) {
  if (!isSpace) {
    return (
      <RoomMemberActionButton
        member={member}
        isRoomMember={isRoomMember}
        canManageRoomMembership={canManageRoomMembership}
        curUserId={curUserId}
        onRemove={onRemove}
        onInvite={onInvite}
      />
    );
  }

  return (
    <SpaceMemberActionMenu
      member={member}
      canManageSpaceMemberPermissions={canManageSpaceMemberPermissions}
      curUserId={curUserId}
      onRemove={onRemove}
      onTransfer={onTransfer}
      onUpdateMemberType={onUpdateMemberType}
      spaceMemberTypeActions={spaceMemberTypeActions}
    />
  );
}

export default function MemberLists({
  className,
  isSpace,
  members,
  roomMemberUserIds,
}: {
  members: SpaceMember[];
  className?: string;
  isSpace: boolean;
  roomMemberUserIds?: number[];
}) {
  const curUserId = useGlobalUserId() ?? -1;
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext.roomId ?? -1;
  const spaceId = spaceContext.spaceId ?? -1;

  const canManageSpaceMemberPermissions = Boolean(spaceContext.canManageMemberPermissions);
  const canManageRoomMembership = hasHostPrivileges(spaceContext.memberType);

  const addRoomMemberMutation = useAddRoomMemberMutation();
  const deleteRoomMemberMutation = useDeleteRoomMemberMutation();
  const deleteSpaceMemberMutation = useDeleteSpaceMemberMutation();
  const updateSpaceMemberTypeMutation = useUpdateSpaceMemberTypeMutation();
  const transferLeader = useTransferLeader();

  const buildHandlers = useCallback((member: SpaceMember, isRoomMember: boolean) => {
    const isSelf = curUserId === member.userId;

    const onRemove = () => {
      if (!isSpace) {
        if (!isRoomMember) {
          return;
        }
        deleteRoomMemberMutation.mutate(
          { roomId, userIdList: [member.userId ?? 0] },
          {
            onSuccess: () => {
              appToast.success(isSelf ? "已退出房间" : "已移出房间");
            },
            onError: (error: any) => {
              const actionLabel = isSelf ? "退出房间" : "移出房间";
              appToast.error(error?.message ? `${actionLabel}失败：${error.message}` : `${actionLabel}失败`);
            },
          },
        );
        return;
      }

      deleteSpaceMemberMutation.mutate(
        { spaceId, userIdList: [member.userId ?? 0] },
        {
          onSuccess: () => {
            appToast.success(isSelf ? "已退出空间" : "已移出空间");
          },
          onError: (error: any) => {
            const actionLabel = isSelf ? "退出空间" : "移出空间";
            appToast.error(error?.message ? `${actionLabel}失败：${error.message}` : `${actionLabel}失败`);
          },
        },
      );
    };

    const onInvite = () => {
      if (isSpace || isRoomMember || !canManageRoomMembership) {
        return;
      }
      addRoomMemberMutation.mutate(
        { roomId, userIdList: [member.userId ?? 0] },
        {
          onSuccess: () => {
            appToast.success("已邀请至房间");
          },
          onError: (error: any) => {
            appToast.error(error?.message ? `邀请失败：${error.message}` : "邀请失败");
          },
        },
      );
    };

    const onUpdateMemberType = (memberType: number) => {
      const nextLabel = getSpaceMemberTypeActions(member.memberType)
        .find(action => action.memberType === memberType)
        ?.label ?? "更新身份";
      updateSpaceMemberTypeMutation.mutate(
        {
          spaceId,
          uidList: [member.userId ?? 0],
          memberType,
        },
        {
          onSuccess: () => {
            appToast.success(`${nextLabel}成功`);
          },
          onError: (error: any) => {
            appToast.error(error?.message ? `${nextLabel}失败：${error.message}` : `${nextLabel}失败`);
          },
        },
      );
    };

    const onTransfer = () => transferLeader.mutate(
      { spaceId, newLeaderId: member.userId ?? 0 },
      {
        onSuccess: () => {
          appToast.success("转让GM/KP成功");
        },
        onError: (error: any) => {
          appToast.error(error?.message ? `转让GM/KP失败：${error.message}` : "转让GM/KP失败");
        },
      },
    );

    return { onInvite, onRemove, onTransfer, onUpdateMemberType };
  }, [addRoomMemberMutation, canManageRoomMembership, curUserId, deleteRoomMemberMutation, deleteSpaceMemberMutation, isSpace, roomId, spaceId, transferLeader, updateSpaceMemberTypeMutation]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const weightDiff = getMemberTypeSortWeight(a.memberType) - getMemberTypeSortWeight(b.memberType);
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return (a.userId ?? 0) - (b.userId ?? 0);
    });
  }, [members]);

  const groupedMembers = useMemo(() => splitMemberGroups({
    isSpace,
    members: sortedMembers,
    roomMemberUserIds,
  }), [isSpace, roomMemberUserIds, sortedMembers]);

  function renderMemberCards(memberRows: SpaceMember[], isRoomMember: boolean, testId: string) {
    return (
      <div className="flex flex-col gap-2" data-testid={testId}>
        {memberRows.map((member) => {
          const { onInvite, onRemove, onTransfer, onUpdateMemberType } = buildHandlers(member, isRoomMember);
          const spaceMemberTypeActions = isSpace ? getSpaceMemberTypeActions(member.memberType) : [];

          return (
            <div className={`
              rounded-lg bg-base-200 p-3
              ${className ?? ""}
            `} key={member.userId}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-row items-center gap-3">
                  <UserAvatarByUser user={member} width={10} isRounded={true} withName={true} />
                </div>
                <div className="flex items-center gap-2">
                  {isSpace && <MemberTypeTag memberType={member.memberType} />}
                  <ActionButtons
                    member={member}
                    isRoomMember={isRoomMember}
                    isSpace={isSpace}
                    canManageRoomMembership={canManageRoomMembership}
                    canManageSpaceMemberPermissions={canManageSpaceMemberPermissions}
                    curUserId={curUserId}
                    onRemove={onRemove}
                    onInvite={onInvite}
                    onTransfer={onTransfer}
                    onUpdateMemberType={onUpdateMemberType}
                    spaceMemberTypeActions={spaceMemberTypeActions}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (!groupedMembers.shouldSplit) {
    return (
      <div className="flex flex-col gap-2">
        {renderMemberCards(sortedMembers, true, "member-list-all-members")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groupedMembers.roomMembers.length > 0 && renderMemberCards(groupedMembers.roomMembers, true, "member-list-room-members")}
      {groupedMembers.roomMembers.length > 0 && groupedMembers.spaceMembers.length > 0 && (
        <div className="my-3 h-px w-full bg-base-300/90" aria-hidden="true" />
      )}
      {groupedMembers.spaceMembers.length > 0 && renderMemberCards(groupedMembers.spaceMembers, false, "member-list-space-members")}
    </div>
  );
};
