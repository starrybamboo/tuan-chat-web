export type MessageDirectType = {
  messageId?: number;
  userId?: number;
  syncId?: number;
  senderId?: number;
  receiverId?: number;
  content?: string;
  messageType?: number;
  replyMessageId?: number;
  status?: number;
  extra?: Record<string, any>;
  createTime?: string;
  updateTime?: string;
};
