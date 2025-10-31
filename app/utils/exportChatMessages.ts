import type { ChatMessageResponse } from "../../api";

/**
 * 聊天记录导出配置
 */
export type ExportOptions = {
  includeTimestamp?: boolean; // 是否包含时间戳
  includeUsername?: boolean; // 是否包含用户名
  dateFormat?: "full" | "short"; // 日期格式：完整或简短
};

/**
 * 将聊天记录导出为文本格式
 * 格式参考：角色名(用户名) YYYY/MM/DD HH:mm:ss\n消息内容
 * @param messages 聊天消息列表
 * @param roleMap 角色信息映射 (roleId -> roleName)
 * @param userMap 用户信息映射 (userId -> username)
 * @param options 导出选项
 * @returns 格式化的文本内容
 */
export function formatChatMessages(
  messages: ChatMessageResponse[],
  roleMap: Map<number, string> = new Map(),
  userMap: Map<number, string> = new Map(),
  options: ExportOptions = {},
): string {
  const {
    includeTimestamp = true,
    includeUsername = true,
    dateFormat = "full",
  } = options;

  return messages
    .map((msg) => {
      const message = msg.message;
      const roleId = message.roleId;
      const roleName = roleMap.get(roleId) || `角色${roleId}`;
      const userId = message.userId;
      const username = userMap.get(userId) || `用户${userId}`;

      // 构建消息头（用户名和时间）
      let header = "";

      if (includeTimestamp && message.createTime) {
        const date = new Date(message.createTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        if (dateFormat === "full") {
          header = `${roleName}${includeUsername ? `(${username})` : ""} ${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        }
        else {
          header = `${roleName}${includeUsername ? `(${username})` : ""} ${hours}:${minutes}:${seconds}`;
        }
      }
      else {
        header = `${roleName}${includeUsername ? `(${username})` : ""}`;
      }

      // 获取消息内容
      let content = "";

      // 处理文本消息
      if (message.messageType === 1 && message.content) {
        content = message.content;
      }
      // 处理转发消息
      else if (message.extra?.forwardMessage?.messageList) {
        const forwardedMessages = message.extra.forwardMessage.messageList;
        const forwardedContent = forwardedMessages
          .map((fMsg: ChatMessageResponse) => {
            const fRoleName = roleMap.get(fMsg.message.roleId) || `角色${fMsg.message.roleId}`;
            return `${fRoleName}: ${fMsg.message.content}`;
          })
          .join("\n  ");
        content = `[转发消息]\n  ${forwardedContent}`;
      }
      // 处理图片消息
      else if (message.messageType === 2) {
        const imageMessage = message.extra?.imageMessage;
        if (imageMessage?.background) {
          content = "[背景图片]";
        }
        else {
          content = "[图片]";
        }
      }
      // 其他消息类型
      else {
        content = "[系统消息]";
      }

      return `${header}\n${content}`;
    })
    .join("\n\n");
}

/**
 * 下载文本文件
 * @param content 文件内容
 * @param filename 文件名
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出聊天记录
 * @param messages 聊天消息列表
 * @param roleMap 角色信息映射
 * @param userMap 用户信息映射
 * @param roomName 房间名称（用于生成文件名）
 * @param options 导出选项
 */
export function exportChatMessages(
  messages: ChatMessageResponse[],
  roleMap: Map<number, string> = new Map(),
  userMap: Map<number, string> = new Map(),
  roomName: string = "聊天记录",
  options: ExportOptions = {},
): void {
  if (messages.length === 0) {
    console.warn("没有消息可导出");
    return;
  }

  // 格式化消息
  const content = formatChatMessages(messages, roleMap, userMap, options);

  // 生成文件名（包含日期）
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const filename = `${roomName}_${year}${month}${day}_${hours}${minutes}.txt`;

  // 下载文件
  downloadTextFile(content, filename);
}
