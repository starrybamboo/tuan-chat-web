import { useDissolveRoomMutation } from "api/hooks/chatQueryHooks";
import { use, useState } from "react";
import { useNavigate } from "react-router";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ConfirmModal from "@/components/common/comfirmModel";
import { useSubscribeRoomMutation, useUnsubscribeRoomMutation } from "../../../../../api/hooks/messageSessionQueryHooks";

interface ChatPageContextMenuProps {
  contextMenu: { x: number; y: number; roomId: number } | null;
  unreadMessagesNumber: Record<number, number>;
  activeRoomId: number | null;
  onClose: () => void;
  onInvitePlayer?: (roomId: number) => void;
  onOpenRoomSetting?: (roomId: number) => void;
}

export default function ChatPageContextMenu({
  contextMenu,
  unreadMessagesNumber,
  activeRoomId,
  onClose,
  onInvitePlayer,
  onOpenRoomSetting,
}: ChatPageContextMenuProps) {
  const navigate = useNavigate();
  const spaceContext = use(SpaceContext);

  const subscribeRoomMutation = useSubscribeRoomMutation();
  const unsubscribeRoomMutation = useUnsubscribeRoomMutation();
  const dissolveRoomMutation = useDissolveRoomMutation();

  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);
  const [dissolveTargetRoomId, setDissolveTargetRoomId] = useState<number | null>(null);

  if (!contextMenu && !isDissolveConfirmOpen)
    return null;

  const isSubscribed = contextMenu ? unreadMessagesNumber[contextMenu.roomId] !== undefined : false;
  const canDissolveRoom = !!spaceContext?.isSpaceOwner && (spaceContext?.spaceId ?? -1) > 0;

  const activeDissolveRoomId = dissolveTargetRoomId;

  return (
    <>
      {contextMenu && (
        <div
          className="fixed bg-base-100 shadow-lg rounded-md z-[9999]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <ul className="menu p-2 w-50">
            <li
              className="relative group"
              onClick={() => {
                onOpenRoomSetting?.(contextMenu.roomId);
                onClose();
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span>房间资料</span>
              </div>
            </li>

            {/* --- Invite Player Menu --- */}
            <li
              className="relative group"
              onClick={() => {
                onInvitePlayer?.(contextMenu.roomId);
                onClose();
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span>邀请玩家</span>
              </div>
            </li>
            {/* --- Notification Settings Menu --- */}
            <li
              className="relative group"
              onClick={() => {
                isSubscribed ? unsubscribeRoomMutation.mutate(contextMenu.roomId) : subscribeRoomMutation.mutate(contextMenu.roomId);
                onClose();
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span>{isSubscribed ? "关闭消息提醒" : "开启消息提醒"}</span>
              </div>
            </li>

            {canDissolveRoom && (
              <li
                className="relative group text-error"
                onClick={() => {
                  setDissolveTargetRoomId(contextMenu.roomId);
                  setIsDissolveConfirmOpen(true);
                  onClose();
                }}
              >
                <div className="flex justify-between items-center w-full">
                  <span>解散房间</span>
                </div>
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
                navigate(`/chat/${spaceContext.spaceId}`, { replace: true });
              }
            },
          });
        }}
      />
    </>
  );
}
