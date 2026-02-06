/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 发送私聊消息请求
 */
export type MessageDirectSendRequest = {
    /**
     * 接收者ID
     */
    receiverId: number;
    /**
     * 消息内容
     */
    content: string;
    /**
     * 消息类型 1:文本 2:ͼƬ 3:文件
     */
    messageType: number;
    /**
     * 回复的消息ID
     */
    replyMessageId?: number;
    /**
     * 扩展信息
     */
    extra: Record<string, any>;
};

