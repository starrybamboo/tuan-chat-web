import type { Message } from "../../../../../api";
import { use } from "react";
import { useGetMessageByIdSmartly } from "@/components/chat/core/hooks";
import { RoomContext } from "@/components/chat/core/roomContext";
import { canCurrentUserViewMessage } from "@/components/chat/utils/hiddenDiceVisibility";
import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useGetRoleQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";
import { getMessagePreviewText } from "./getMessagePreviewText";
import { MessagePreviewContent } from "./messagePreviewContent";

/**
 * 消息预览组件，用于显示消息的简要内容
 * @param props 组件属性
 * @param props.message 可以是Message对象或消息ID 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
 * @param props.className 自定义样式类名
 */
export function PreviewMessage({ message, className, withMediaPreview }: {
  message: Message | number; // 允许message为id
  className?: string;
  withMediaPreview?: boolean;
}) {
  const roomContext = use(RoomContext);
  // 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
  const getMessageByIdSmartly = useGetMessageByIdSmartly(typeof message === "number" ? message : -1);
  const messageBody = typeof message === "number"
    ? getMessageByIdSmartly
    : message;
  const canViewMessage = canCurrentUserViewMessage(messageBody, {
    currentUserId: roomContext.curMember?.userId,
    memberType: roomContext.curMember?.memberType,
  });
  const previewMessage = canViewMessage ? messageBody : undefined;

  const useRoleRequest = useGetRoleQuery(previewMessage?.roleId ?? -1);
  const role = useRoleRequest.data?.data;
  const isDeleted = previewMessage?.status === 1;
  const isIntroText = previewMessage?.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const isOutOfCharacterText = previewMessage?.messageType === MESSAGE_TYPE.TEXT
    && isOutOfCharacterSpeech(previewMessage.content);
  const displayRoleName = previewMessage
    ? getDisplayRoleName({
        roleId: previewMessage.roleId,
        roleName: role?.roleName,
        customRoleName: previewMessage.customRoleName,
        isIntroText,
      })
    : "";

  const previewText = canViewMessage ? getMessagePreviewText(previewMessage) : "[消息不可见]";

  return (
    <span className={`text-xs sm:text-sm line-clamp-3 opacity-60 break-words min-w-0 ${isOutOfCharacterText ? "italic" : ""} ${className}`}>
      {
        isDeleted || !canViewMessage
          ? previewText
          : (
              <>
                {displayRoleName ? `【${displayRoleName}】: ` : ""}
                <MessagePreviewContent message={previewMessage} withMediaPreview={withMediaPreview} />
              </>
            )
      }
    </span>
  );
}
