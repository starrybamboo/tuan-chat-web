import type { RoomSettingTab } from "@/components/chat/chatPage.types";
import { AddressBookIcon, BellIcon, BellSlashIcon, InfoIcon, TrashIcon, UserPlusIcon, UsersIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { useDissolveRoomMutation } from "api/hooks/chatQueryHooks";
import { use, useEffect, useRef, useState } from "react";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { canManageMemberPermissions } from "@/components/chat/utils/memberPermissions";
import ConfirmModal from "@/components/common/comfirmModel";
import { useSubscribeRoomMutation, useUnsubscribeRoomMutation } from "../../../../../api/hooks/messageSessionQueryHooks";
import { clampFloatingMenuPosition } from "../floatingMenuPosition";

interface ChatPageContextMenuProps {
  contextMenu: { x: number; y: number; roomId: number } | null;
  unreadMessagesNumber: Record<number, number>;
  activeRoomId: number | null;
  onClose: () => void;
  onInvitePlayer?: (roomId: number) => void;
  onOpenRoomSetting?: (roomId: number, tab?: RoomSettingTab) => void;
}

export default function ChatPageContextMenu({
  contextMenu,
  unreadMessagesNumber,
  activeRoomId,
  onClose,
  onInvitePlayer,
  onOpenRoomSetting,
}: ChatPageContextMenuProps) {
  const router = useRouter();
  const spaceContext = use(SpaceContext);

  const subscribeRoomMutation = useSubscribeRoomMutation();
  const unsubscribeRoomMutation = useUnsubscribeRoomMutation();
  const dissolveRoomMutation = useDissolveRoomMutation();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);
  const [dissolveTargetRoomId, setDissolveTargetRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (!contextMenu || !menuRef.current) {
      return;
    }

    const menuElement = menuRef.current;
    const nextPosition = clampFloatingMenuPosition(
      { x: contextMenu.x, y: contextMenu.y },
      {
        width: menuElement.offsetWidth || menuElement.getBoundingClientRect().width,
        height: menuElement.offsetHeight || menuElement.getBoundingClientRect().height,
      },
      {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    );

    menuElement.style.left = `${nextPosition.x}px`;
    menuElement.style.top = `${nextPosition.y}px`;
  }, [contextMenu]);

  if (!contextMenu && !isDissolveConfirmOpen)
    return null;

  const isSubscribed = contextMenu ? unreadMessagesNumber[contextMenu.roomId] !== undefined : false;
  const canDissolveRoom = !!spaceContext?.isSpaceOwner && (spaceContext?.spaceId ?? -1) > 0;
  const canInvitePlayer = canManageMemberPermissions(spaceContext?.memberType);

  const activeDissolveRoomId = dissolveTargetRoomId;
  const menuButtonClassName = "flex w-full items-center gap-2.5 text-left";
  const handleOpenRoomSetting = (tab?: RoomSettingTab) => {
    onOpenRoomSetting?.(contextMenu?.roomId ?? -1, tab);
    onClose();
  };

  return (
    <>
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-base-100 shadow-lg rounded-md z-9999"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <ul className="menu p-2 w-50">
            <li className="relative group">
              <button
                type="button"
                className={menuButtonClassName}
                onClick={() => {
                  handleOpenRoomSetting();
                }}
              >
                <InfoIcon className="size-4 shrink-0" weight="regular" />
                <span>房间资料</span>
              </button>
            </li>

            <li className="relative group">
              <button
                type="button"
                className={menuButtonClassName}
                onClick={() => {
                  handleOpenRoomSetting("member");
                }}
              >
                <UsersIcon className="size-4 shrink-0" weight="regular" />
                <span>房间成员</span>
              </button>
            </li>

            <li className="relative group">
              <button
                type="button"
                className={menuButtonClassName}
                onClick={() => {
                  handleOpenRoomSetting("role");
                }}
              >
                <AddressBookIcon className="size-4 shrink-0" weight="regular" />
                <span>房间角色</span>
              </button>
            </li>

            {/* --- Invite Player Menu --- */}
            {canInvitePlayer && (
              <li className="relative group">
                <button
                  type="button"
                  className={menuButtonClassName}
                  onClick={() => {
                    onInvitePlayer?.(contextMenu.roomId);
                    onClose();
                  }}
                >
                  <UserPlusIcon className="size-4 shrink-0" weight="regular" />
                  <span>邀请玩家</span>
                </button>
              </li>
            )}
            {/* --- Notification Settings Menu --- */}
            <li className="relative group">
              <button
                type="button"
                className={menuButtonClassName}
                onClick={() => {
                  if (isSubscribed) {
                    unsubscribeRoomMutation.mutate(contextMenu.roomId);
                  }
                  else {
                    subscribeRoomMutation.mutate(contextMenu.roomId);
                  }
                  onClose();
                }}
              >
                {isSubscribed
                  ? <BellSlashIcon className="size-4 shrink-0" weight="regular" />
                  : <BellIcon className="size-4 shrink-0" weight="regular" />}
                <span>{isSubscribed ? "关闭消息提醒" : "开启消息提醒"}</span>
              </button>
            </li>

            {canDissolveRoom && (
              <li className="relative group text-error">
                <button
                  type="button"
                  className={`
                    ${menuButtonClassName}
                    text-error
                  `}
                  onClick={() => {
                    setDissolveTargetRoomId(contextMenu.roomId);
                    setIsDissolveConfirmOpen(true);
                    onClose();
                  }}
                >
                  <TrashIcon className="size-4 shrink-0" weight="regular" />
                  <span>解散房间</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      <ConfirmModal
        isOpen={isDissolveConfirmOpen}
        onClose={() => {
          setIsDissolveConfirmOpen(false);
          setDissolveTargetRoomId(null);
        }}
        title="确认解散房间"
        message="是否确定要解散该房间？此操作不可逆。"
        onConfirm={() => {
          if (activeDissolveRoomId == null) {
            return;
          }

          dissolveRoomMutation.mutate(activeDissolveRoomId, {
            onSuccess: () => {
              setIsDissolveConfirmOpen(false);
              setDissolveTargetRoomId(null);

              // 如果解散的是当前正在浏览的房间，跳回空间根路由，避免停留在已删除房间。
              if (spaceContext?.spaceId && activeRoomId === activeDissolveRoomId) {
                spaceContext.setActiveRoomId?.(null);
                router.history.replace(`/chat/${spaceContext.spaceId}`);
              }
            },
          });
        }}
      />
    </>
  );
}
