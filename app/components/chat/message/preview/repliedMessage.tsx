import type { Message } from "../../../../../api";
import React, { use } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { XMarkICon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
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
  const role = useGetRoleQuery(replyMessage.roleId ?? -1).data?.data;
  const isIntroText = replyMessage.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const scrollToGivenMessage = roomContext.scrollToGivenMessage;
  const displayRoleName = getDisplayRoleName({
    roleId: replyMessage.roleId,
    roleName: role?.roleName,
    customRoleName: replyMessage.customRoleName,
    isIntroText,
  });
  const isDeleted = replyMessage.status === 1;
  const namePrefix = !isDeleted && displayRoleName ? `${displayRoleName}: ` : "";
  return (
    <div className={className} onClick={() => scrollToGivenMessage && scrollToGivenMessage(replyMessage.messageId)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setReplyMessage(undefined);
        }}
        aria-label="取消回复"
        title="取消回复"
        className="size-4 opacity-70 transition-opacity hover:bg-base-300"
        type="button"
      >
        <XMarkICon className="size-4"></XMarkICon>
      </button>
      <span className="opacity-60 inline flex-shrink-0">回复</span>
      <span className="text-xs sm:text-sm line-clamp-3 opacity-60 break-words min-w-0">
        {namePrefix}
        <MessagePreviewContent message={replyMessage} withMediaPreview />
      </span>
    </div>
  );
}
