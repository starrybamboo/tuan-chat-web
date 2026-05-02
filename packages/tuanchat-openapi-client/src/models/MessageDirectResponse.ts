/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageExtra } from './MessageExtra';
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
     * 发送者头像媒体文件 ID
     */
    senderAvatarFileId?: number;
    /**
     * 发送者头像媒体类型
     */
    senderAvatarMediaType?: string;
    /**
     * 接收者ID
     */
    receiverId?: number;
    /**
     * 接收者用户名
     */
    receiverUsername?: string;
    /**
     * 接收者头像媒体文件 ID
     */
    receiverAvatarFileId?: number;
    /**
     * 接收者头像媒体类型
     */
    receiverAvatarMediaType?: string;
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
    extra?: MessageExtra;
    /**
     * 创建时间
     */
    createTime?: string;
};

