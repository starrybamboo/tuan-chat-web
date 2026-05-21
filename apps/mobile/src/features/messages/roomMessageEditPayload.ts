import type { Message } from "@tuanchat/openapi-client/models/Message";

/**
 * 构造移动端编辑消息请求，沿用服务端已有时间字段，避免客户端注入不兼容的 LocalDateTime 格式。
 */
export function buildEditedRoomMessage(originalMessage: Message, content: string): Message {
  return {
    ...originalMessage,
    content,
  };
}
