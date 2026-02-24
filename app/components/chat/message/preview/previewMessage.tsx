import type { Message } from "../../../../../api";
import { useGetMessageByIdSmartly } from "@/components/chat/core/hooks";
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
  // 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
  const getMessageByIdSmartly = useGetMessageByIdSmartly(typeof message === "number" ? message : -1);
  const messageBody = typeof message === "number"
    ? getMessageByIdSmartly
    : message;

  const useRoleRequest = useGetRoleQuery(messageBody?.roleId ?? -1);
  const role = useRoleRequest.data?.data;
  const isDeleted = messageBody?.status === 1;
  const isIntroText = messageBody?.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const displayRoleName = messageBody
    ? getDisplayRoleName({
        roleId: messageBody.roleId,
        roleName: role?.roleName,
        customRoleName: messageBody.customRoleName,
        isIntroText,
      })
    : "";

  const previewText = getMessagePreviewText(messageBody);

  return (
    <span className={`text-xs sm:text-sm line-clamp-3 opacity-60 break-words min-w-0 ${className}`}>
      {
        isDeleted
          ? previewText
          : (
              <>
                {displayRoleName ? `【${displayRoleName}】: ` : ""}
                <MessagePreviewContent message={messageBody} withMediaPreview={withMediaPreview} />
              </>
            )
      }
    </span>
  );
}
