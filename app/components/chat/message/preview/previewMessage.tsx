import type { Message } from "../../../../../api";
import { useGetMessageByIdSmartly } from "@/components/chat/core/hooks";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalVarPayload, formatWebgalVarSummary } from "@/types/webgalVar";
import { useGetRoleQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";

/**
 * 消息预览组件，用于显示消息的简要内容
 * @param props 组件属性
 * @param props.message 可以是Message对象或消息ID 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
 * @param props.className 自定义样式类名
 */
export function PreviewMessage({ message, className }: {
  message: Message | number; // 允许messageΪid
  className?: string;
}) {
  // 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
  const getMessageByIdSmartly = useGetMessageByIdSmartly(typeof message === "number" ? message : -1);
  const messageBody = typeof message === "number"
    ? getMessageByIdSmartly
    : message;

  const useRoleRequest = useGetRoleQuery(messageBody?.roleId ?? -1);
  const role = useRoleRequest.data?.data;
  const isTextMessage = messageBody?.messageType === 1;
  const isWebgalVarMessage = messageBody?.messageType === MESSAGE_TYPE.WEBGAL_VAR;
  const isDocCardMessage = messageBody?.messageType === MESSAGE_TYPE.DOC_CARD;
  const isDeleted = messageBody?.status === 1;

  const webgalVarSummary = isWebgalVarMessage
    ? (() => {
        const payload = extractWebgalVarPayload(messageBody?.extra);
        return payload ? formatWebgalVarSummary(payload) : null;
      })()
    : null;

  const docCardTitle = isDocCardMessage
    ? (() => {
        const raw = (messageBody as any)?.extra?.docCard ?? (messageBody as any)?.extra ?? null;
        const title = typeof raw?.title === "string" ? raw.title.trim() : "";
        const docId = typeof raw?.docId === "string" ? raw.docId.trim() : "";
        return title || docId || "文档";
      })()
    : null;

  return (
    <span className={`text-xs sm:text-sm line-clamp-3 opacity-60 break-words ${className}`}>
      {
        isDeleted
          ? "[原消息已被删除]"
          : `【${role?.roleName || "未命名角色"}】: ${
            isTextMessage
              ? (messageBody.content || "")
              : isWebgalVarMessage
                ? `[变量] ${webgalVarSummary ?? ""}`.trim()
                : isDocCardMessage
                  ? `[文档] ${docCardTitle ?? ""}`.trim()
                  : "非文本消息"
          }`
      }
    </span>
  );
}
