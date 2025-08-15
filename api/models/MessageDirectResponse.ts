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
     * 发送者ID
     */
    senderId?: number;
    /**
     * 接收者ID
     */
    receiverId?: number;
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
    /**
     * 更新时间
     */
    updateTime?: string;
};

