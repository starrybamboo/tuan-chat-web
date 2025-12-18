import type { Message } from "../../../../../api";
import { useGetMessageByIdSmartly } from "@/components/chat/core/hooks";
import { useGetRoleQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";

/**
 * 消息预览组件，用于显示消息的简要内容
 * @param props 组件属性
 * @param props.message 可以是Message对象或消息ID 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
 * @param props.className 自定义样式类名
 */
export function PreviewMessage({ message, className }: {
  message: Message | number; // 允许message为id
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
  const isDeleted = messageBody?.status === 1;

  return (
    <span className={`text-sm line-clamp-3 opacity-60 break-words ${className}`}>
      {
        isDeleted
          ? "[原消息已被删除]"
          : `【${role?.roleName || "未命名角色"}】: ${isTextMessage ? messageBody.content : "非文本消息"}`
      }
    </span>
  );
}
