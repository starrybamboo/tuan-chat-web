import { useSubscribeRoomMutation, useUnsubscribeRoomMutation } from "../../../../../api/hooks/messageSessionQueryHooks";

interface ChatPageContextMenuProps {
  contextMenu: { x: number; y: number; roomId: number } | null;
  unreadMessagesNumber: Record<number, number>;
  onClose: () => void;
  onInvitePlayer?: (roomId: number) => void;
}

export default function ChatPageContextMenu({
  contextMenu,
  unreadMessagesNumber,
  onClose,
  onInvitePlayer,
}: ChatPageContextMenuProps) {
  const subscribeRoomMutation = useSubscribeRoomMutation();
  const unsubscribeRoomMutation = useUnsubscribeRoomMutation();

  if (!contextMenu)
    return null;

  const isSubscribed = unreadMessagesNumber[contextMenu.roomId] !== undefined;

  return (
    <div
      className="fixed bg-base-100 shadow-lg rounded-md z-40"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={e => e.stopPropagation()}
    >
      <ul className="menu p-2 w-50">
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
      </ul>
    </div>
  );
}
