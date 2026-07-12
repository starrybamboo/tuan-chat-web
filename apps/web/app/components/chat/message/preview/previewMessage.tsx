import { use } from "react";

import { useGetMessageByIdSmartly } from "@/components/chat/core/hooks";
import { RoomContext } from "@/components/chat/core/roomContext";
import { canCurrentUserViewHiddenDiceReply, canCurrentUserViewMessage } from "@/components/chat/utils/hiddenDiceVisibility";
import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getMessagePreviewText } from "@tuanchat/domain/message-preview";

import type { Message } from "../../../../../api";

import { useGetRoleQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";
import { MessagePreviewContent } from "./messagePreviewContent";

type PreviewRenderState = {
  previewMessage?: Message;
  previewText: string;
  isPlainTextOnly: boolean;
}

export function buildPreviewRenderState({
  messageBody,
  fallbackPreviewMessage,
  canViewMessage,
  canViewHiddenDiceReply = false,
}: {
  messageBody?: Message;
  fallbackPreviewMessage?: Message;
  canViewMessage: boolean;
  canViewHiddenDiceReply?: boolean;
}): PreviewRenderState {
  if (messageBody) {
    if (!canViewMessage) {
      return {
        previewText: "[消息不可见]",
        isPlainTextOnly: true,
      };
    }
    return {
      previewMessage: messageBody,
      previewText: getMessagePreviewText(messageBody, {
        canViewHiddenDiceReply,
      }),
      isPlainTextOnly: messageBody.status === 1,
    };
  }

  if (fallbackPreviewMessage) {
    return {
      previewMessage: fallbackPreviewMessage,
      previewText: getMessagePreviewText(fallbackPreviewMessage, {
        canViewHiddenDiceReply,
      }),
      isPlainTextOnly: fallbackPreviewMessage.status === 1,
    };
  }

  return {
    previewText: getMessagePreviewText(undefined),
    isPlainTextOnly: true,
  };
}

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
  const hasResolvedMessage = Boolean(messageBody);
  const canViewMessage = hasResolvedMessage && canCurrentUserViewMessage(messageBody, {
    currentUserId: roomContext.curMember?.userId,
    memberType: roomContext.curMember?.memberType,
  });
  const canViewHiddenDiceReply = hasResolvedMessage && canCurrentUserViewHiddenDiceReply(messageBody, {
    currentUserId: roomContext.curMember?.userId,
    memberType: roomContext.curMember?.memberType,
  });
  const renderState = buildPreviewRenderState({
    messageBody,
    fallbackPreviewMessage: undefined,
    canViewMessage,
    canViewHiddenDiceReply,
  });
  const previewMessage = renderState.previewMessage;

  const roleFromRoom = roomContext.roomAllRoles?.find(role => role.roleId === previewMessage?.roleId);
  const useRoleRequest = useGetRoleQuery(previewMessage?.roleId ?? -1, { enabled: !roleFromRoom });
  const role = roleFromRoom ?? useRoleRequest.data?.data;
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
        zeroRoleIsNarrator: true,
      })
    : "";

  return (
    <span className={`
      text-xs
      sm:text-sm
      line-clamp-3 opacity-60 wrap-break-word min-w-0
      ${isOutOfCharacterText ? `italic` : ""}
      ${className}
    `}>
      {
        isDeleted || renderState.isPlainTextOnly
          ? renderState.previewText
          : (
              <>
                {displayRoleName ? `【${displayRoleName}】: ` : ""}
                <MessagePreviewContent
                  message={previewMessage}
                  withMediaPreview={withMediaPreview}
                  canViewHiddenDiceReply={canViewHiddenDiceReply}
                />
              </>
            )
      }
    </span>
  );
}
