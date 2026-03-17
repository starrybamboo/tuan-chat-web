/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 私聊消息响应
 */
export type MessageDirectResponse = {
    /**
     * 消息ID
     */
    messageId?: number;
    /**
     * 收件箱用户ID
     */
    userId?: number;
    /**
     * 会话级别的消息递增ID
     */
    syncId?: number;
    /**
     * 发送者ID
     */
    senderId?: number;
    /**
     * 发送者用户名
     */
    senderUsername?: string;
    /**
     * 发送者头像 URL
     */
    senderAvatar?: string;
    /**
     * 发送者头像缩略图 URL
     */
    senderAvatarThumbUrl?: string;
    /**
     * 接收者ID
     */
    receiverId?: number;
    /**
     * 接收者用户名
     */
    receiverUsername?: string;
    /**
     * 接收者头像 URL
     */
    receiverAvatar?: string;
    /**
     * 接收者头像缩略图 URL
     */
    receiverAvatarThumbUrl?: string;
    /**
     * 消息内容
     */
    content?: string;
    /**
     * 消息类型
     */
    messageType?: number;
    /**
     * 回复的消息ID
     */
    replyMessageId?: number;
    /**
     * 消息状态
     */
    status?: number;
    /**
     * 扩展信息
     */
    extra?: Record<string, any>;
    /**
     * 创建时间
     */
    createTime?: string;
};

