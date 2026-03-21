import type { SpaceMember } from "../../../../../api";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { MemberTypeTag } from "@/components/chat/message/types/memberTypeTag";
import {
  getMemberTypeSortWeight,
  hasHostPrivileges,
  SPACE_MEMBER_TYPE,
} from "@/components/chat/utils/memberPermissions";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { useGlobalContext } from "@/components/globalContextProvider";
import {
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

function ActionButtons({
  member,
  isSpace,
  canManageRoomMembership,
  canManageSpaceMemberPermissions,
  curUserId,
  onRemove,
  onTransfer,
  onUpdateMemberType,
  spaceMemberTypeActions,
}: {
  member: SpaceMember;
  isSpace: boolean;
  canManageRoomMembership: boolean;
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
  const canManageRoomTarget = !isSpace && canManageRoomMembership && !isSelf;
  const canManageSpaceTarget = isSpace && canManageSpaceMemberPermissions && !isSelf;

  const shouldHide = !isSelf && !canManageRoomTarget && !canManageSpaceTarget;

  const MenuItem = ({ label, onClick, danger = false, first = false }: { label: string; onClick: () => void; danger?: boolean; first?: boolean }) => (
    <li>
      <button
        ref={first ? firstItemRef : undefined}
        type="button"
        className={`justify-start w-full text-left ${danger ? "text-error hover:text-error" : ""}`}
        onClick={() => {
          onClick();
          setOpen(false);
          triggerBtnRef.current?.focus();
        }}
      >
        {label}
      </button>
    </li>
  );

  // 外部点击关闭 & 键盘Esc关闭
  useEffect(() => {
    if (!open)
      return;
    const handleDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerBtnRef.current?.focus();
      }
      if (e.key === "ArrowDown") {
        // 下箭头聚焦第一项
        if (firstItemRef.current) {
          e.preventDefault();
          firstItemRef.current.focus();
        }
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // 打开后聚焦第一项 & 计算位置（仅决定向上/向下放置，避免 inline style）
  useEffect(() => {
    if (open) {
      const triggerRect = triggerBtnRef.current?.getBoundingClientRect();
      requestAnimationFrame(() => {
        if (triggerRect) {
          const viewportH = window.innerHeight;
          const estimatedHeight = 220; // 近似值（菜单 max-h 固定，不需要精确）
          const menuHeight = estimatedHeight;

          // 计算向下和向上的可用空间
          const spaceBelow = viewportH - triggerRect.bottom;
          const spaceAbove = triggerRect.top;

          // 优化的定位逻辑（默认向上优先）：
          // 1. 如果上方空间充足（至少比菜单高度多20px的缓冲），向上放置
          // 2. 如果上方空间不足但下方空间充足，向下放置
          // 3. 如果两边都不够，选择空间更大的一边
          let nextPlaceUp = true; // 默认向上

          if (spaceAbove < menuHeight + 20) {
            // 上方空间不足
            if (spaceBelow >= menuHeight + 20) {
              // 下方空间充足，向下放置
              nextPlaceUp = false;
            }
            else {
              // 两边都不够，选择空间更大的一边
              nextPlaceUp = spaceAbove > spaceBelow;
            }
          }

          setPlaceUp(nextPlaceUp);
        }
      });
      if (firstItemRef.current) {
        requestAnimationFrame(() => firstItemRef.current?.focus());
      }
    }
  }, [open]);

  if (shouldHide)
    return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={triggerBtnRef}
        type="button"
        className="btn btn-ghost btn-xs px-2"
        onClick={() => setOpen(o => !o)}
        aria-label="更多操作"
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
          className={`menu menu-xs dropdown-content absolute right-0 z-20 p-2 shadow bg-base-200 rounded-box w-48 overflow-auto max-h-60 animate-fadeIn ${placeUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"}`}
          aria-label="成员操作菜单"
        >
          {isSelf && <MenuItem first label={isSpace ? "退出空间" : "退出群聊"} onClick={onRemove} danger />}
          {canManageRoomTarget && (
            <>
              <MenuItem first={!isSelf} label="移出房间" onClick={onRemove} danger />
            </>
          )}
          {canManageSpaceTarget && (
            <>
              {spaceMemberTypeActions.map((action, index) => (
                <MenuItem
                  key={`${member.userId}-${action.memberType}`}
                  first={!isSelf && index === 0}
                  label={action.label}
                  onClick={() => onUpdateMemberType(action.memberType)}
                />
              ))}
              <MenuItem label="转让GM/KP" onClick={onTransfer} />
              <MenuItem label="移出空间" onClick={onRemove} danger />
            </>
          )}
        </ul>
      )}
    </div>
  );
}

export default function MemberLists({ members, className, isSpace }: { members: (SpaceMember)[]; className?: string; isSpace: boolean }) {
  // 获取上下文与全局信息
  const globalCtx = useGlobalContext();
  const curUserId = globalCtx.userId ?? -1;
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const roomId = roomContext.roomId ?? -1;
  const spaceId = spaceContext.spaceId ?? -1;

  const canManageSpaceMemberPermissions = Boolean(spaceContext.canManageMemberPermissions);
  const canManageRoomMembership = hasHostPrivileges(spaceContext.memberType);

  // mutations
  const mutateRoomMember = useDeleteRoomMemberMutation();
  const mutateSpaceMember = useDeleteSpaceMemberMutation();
  const updateSpaceMemberTypeMutation = useUpdateSpaceMemberTypeMutation();
  const transferLeader = useTransferLeader();

  const buildHandlers = useCallback((member: SpaceMember) => {
    const onRemove = () => {
      if (!isSpace) {
        mutateRoomMember.mutate(
          { roomId, userIdList: [member.userId ?? 0] },
          {
            onSuccess: () => {
              toast.success("已移出房间");
            },
            onError: (error: any) => {
              toast.error(error?.message ? `移出房间失败：${error.message}` : "移出房间失败");
            },
          },
        );
      }
      else if (isSpace) {
        mutateSpaceMember.mutate(
          { spaceId, userIdList: [member.userId ?? 0] },
          {
            onSuccess: () => {
              toast.success("已移出空间");
            },
            onError: (error: any) => {
              toast.error(error?.message ? `移出空间失败：${error.message}` : "移出空间失败");
            },
          },
        );
      }
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
            toast.success(`${nextLabel}成功`);
          },
          onError: (error: any) => {
            toast.error(error?.message ? `${nextLabel}失败：${error.message}` : `${nextLabel}失败`);
          },
        },
      );
    };
    const onTransfer = () => transferLeader.mutate(
      { spaceId, newLeaderId: member.userId ?? 0 },
      {
        onSuccess: () => {
          toast.success("转让GM/KP成功");
        },
        onError: (error: any) => {
          toast.error(error?.message ? `转让GM/KP失败：${error.message}` : "转让GM/KP失败");
        },
      },
    );
    return { onRemove, onUpdateMemberType, onTransfer };
  }, [isSpace, mutateRoomMember, mutateSpaceMember, roomId, spaceId, transferLeader, updateSpaceMemberTypeMutation]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const weightDiff = getMemberTypeSortWeight(a.memberType) - getMemberTypeSortWeight(b.memberType);
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return (a.userId ?? 0) - (b.userId ?? 0);
    });
  }, [members]);

  return (
    <div className="flex flex-col gap-2">
      {sortedMembers.map((member) => {
        const { onRemove, onUpdateMemberType, onTransfer } = buildHandlers(member);
        const spaceMemberTypeActions = isSpace ? getSpaceMemberTypeActions(member.memberType) : [];
        return (
          <div className={`bg-base-200 p-3 rounded-lg ${className ?? ""}`} key={member.userId}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-row gap-3 items-center">
                <UserAvatarByUser user={member} width={10} isRounded={true} withName={true} />
              </div>
              <div className="flex items-center gap-2">
                {isSpace && <MemberTypeTag memberType={member.memberType} />}
                <ActionButtons
                  member={member}
                  isSpace={isSpace}
                  canManageRoomMembership={canManageRoomMembership}
                  canManageSpaceMemberPermissions={canManageSpaceMemberPermissions}
                  curUserId={curUserId}
                  onRemove={onRemove}
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
};
