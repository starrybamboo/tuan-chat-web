/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 插入消息请求
 */
export type InsertMessageRequest = {
    /**
     * 消息内容
     */
    content?: string;
    /**
     * 房间ID
     */
    roomId: number;
    /**
     * 消息类型
     */
    messageType: number;
    /**
     * 消息体
     */
    extra?: Record<string, any>;
    /**
     * 角色ID
     */
    roleId?: number;
    /**
     * 头像ID
     */
    avatarId?: number;
    /**
     * 插入位置前面的消息ID
     */
    beforeMessageId?: number;
    /**
     * 插入位置后面的消息ID
     */
    afterMessageId?: number;
};

