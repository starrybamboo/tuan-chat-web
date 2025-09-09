import type { RoomMember, SpaceMember } from "../../../../api";
import { RoomContext } from "@/components/chat/roomContext";
import { MemberTypeTag } from "@/components/chat/smallComponents/memberTypeTag";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { use, useCallback, useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [placeUp, setPlaceUp] = useState(true);
  const [maxHeight, setMaxHeight] = useState(240); // 默认最大高度
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  const isSelf = curUserId === member.userId;
  const canManage = isManager && curUserId !== member.userId; // 管理员且目标不是自己

  // 不需要显示菜单的情况：既不是自己也不是管理员 或 spaceId无效
  const shouldHide = spaceId <= 0 || (!isSelf && !canManage);

  const MenuItem = ({ label, onClick, danger = false, first = false }: { label: string; onClick: () => void; danger?: boolean; first?: boolean }) => (
    <li role="none">
      <button
        ref={first ? firstItemRef : undefined}
        type="button"
        role="menuitem"
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

  // 打开后聚焦第一项 & 计算位置
  useEffect(() => {
    if (open) {
      const triggerRect = triggerBtnRef.current?.getBoundingClientRect();
      requestAnimationFrame(() => {
        if (triggerRect) {
          const viewportH = window.innerHeight;
          // 预估菜单高度（若已渲染可读取）
          const estimatedHeight = 200; // fallback
          const menuElement = firstItemRef.current?.parentElement;
          const menuHeight = menuElement?.getBoundingClientRect().height || estimatedHeight;

          // 计算向下和向上的可用空间
          const spaceBelow = viewportH - triggerRect.bottom;
          const spaceAbove = triggerRect.top;

          // 优化的定位逻辑（默认向上优先）：
          // 1. 如果上方空间充足（至少比菜单高度多20px的缓冲），向上放置
          // 2. 如果上方空间不足但下方空间充足，向下放置
          // 3. 如果两边都不够，选择空间更大的一边
          let nextPlaceUp = true; // 默认向上
          let dynamicMaxHeight = 240; // 默认最大高度

          if (spaceAbove < menuHeight + 20) {
            // 上方空间不足
            if (spaceBelow >= menuHeight + 20) {
              // 下方空间充足，向下放置
              nextPlaceUp = false;
              dynamicMaxHeight = Math.min(240, spaceBelow - 20);
            }
            else {
              // 两边都不够，选择空间更大的一边
              nextPlaceUp = spaceAbove > spaceBelow;
              dynamicMaxHeight = Math.min(240, Math.max(spaceAbove, spaceBelow) - 20);
            }
          }
          else {
            // 上方空间充足
            dynamicMaxHeight = Math.min(240, spaceAbove - 20);
          }

          setPlaceUp(nextPlaceUp);
          setMaxHeight(Math.max(120, dynamicMaxHeight)); // 最小高度120px
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
        aria-haspopup="true"
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
          className={`menu menu-xs dropdown-content absolute right-0 z-20 p-2 shadow bg-base-200 rounded-box w-40 overflow-auto animate-fadeIn ${placeUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"}`}
          style={{ maxHeight: `${maxHeight}px` }}
          role="menu"
          aria-label="成员操作菜单"
        >
          {isSelf && <MenuItem first label="退出群聊" onClick={onRemove} danger />}
          {canManage && (
            <>
              <MenuItem first={!isSelf} label="踢出成员" onClick={onRemove} danger />
              {(member?.memberType ?? -1) === 3 && <MenuItem label="设为玩家" onClick={onSetPlayer} />}
              {(member?.memberType ?? -1) === 2 && <MenuItem label="撤销成员身份" onClick={onRevokePlayer} />}
              <MenuItem label="转让KP" onClick={onTransfer} />
            </>
          )}
        </ul>
      )}
    </div>
  );
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
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-row gap-3 items-center">
                <UserAvatarComponent userId={member.userId ?? 0} width={10} isRounded={true} withName={true} />
              </div>
              <div className="flex items-center gap-2">
                <MemberTypeTag memberType={member.memberType} />
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
            </div>
          </div>
        );
      })}
    </div>
  );
};
