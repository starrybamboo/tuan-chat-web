import { use } from "react";

import { RoomContext } from "@/components/chat/core/roomContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { XMarkICon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../../api";

import { useGetRoleQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";
import { MessagePreviewContent } from "./messagePreviewContent";

/**
 * 回复的消息
 * @param replyMessage 可以是Message对象或消息ID 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用。
 * @param className className
 * @constructor
 */
export default function RepliedMessage({ replyMessage, className }: {
  replyMessage: Message;
  className?: string;
}) {
  const roomContext = use(RoomContext);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const roleFromRoom = roomContext.roomAllRoles?.find(role => role.roleId === replyMessage.roleId);
  const roleQuery = useGetRoleQuery(replyMessage.roleId ?? -1, { enabled: !roleFromRoom });
  const role = roleFromRoom ?? roleQuery.data?.data;
  const isIntroText = replyMessage.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const isOutOfCharacterText = replyMessage.messageType === MESSAGE_TYPE.TEXT
    && isOutOfCharacterSpeech(replyMessage.content);
  const scrollToGivenMessage = roomContext.scrollToGivenMessage;
  const displayRoleName = getDisplayRoleName({
    roleId: replyMessage.roleId,
    roleName: role?.roleName,
    customRoleName: replyMessage.customRoleName,
    isIntroText,
    zeroRoleIsNarrator: true,
  });
  const isDeleted = replyMessage.status === 1;
  const namePrefix = !isDeleted && displayRoleName ? `${displayRoleName}: ` : "";
  return (
    <div className={className}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setReplyMessage(undefined);
        }}
        aria-label="取消回复"
        title="取消回复"
        className="
          size-4 opacity-70 transition-opacity
          hover:bg-base-300
        "
        type="button"
      >
        <XMarkICon className="size-4"></XMarkICon>
      </button>
      <button
        type="button"
        className="
          inline-flex min-w-0 flex-1 items-start gap-1 text-left
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-info
        "
        onClick={() => scrollToGivenMessage?.(replyMessage.messageId)}
        aria-label={`跳转到回复消息：${namePrefix}${replyMessage.content ?? ""}`}
      >
        <span className="opacity-60 inline shrink-0">回复</span>
        <span className={`
          text-xs
          sm:text-sm
          line-clamp-3 opacity-60 wrap-break-word min-w-0
          ${isOutOfCharacterText ? `italic` : ""}
        `}>
          {namePrefix}
          <MessagePreviewContent message={replyMessage} withMediaPreview />
        </span>
      </button>
    </div>
  );
}
