/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 消息会话响应
 */
export type MessageSessionResponse = {
    /**
     * 房间ID
     */
    roomId?: number;
    /**
     * 最后已读消息的sync_id
     */
    lastReadSyncId?: number;
    /**
     * 房间最新消息的sync_id
     */
    latestSyncId?: number;
    /**
     * 最后活跃时间
     */
    lastActiveTime?: string;
    /**
     * 最新消息内容
     */
    lastMessageContent?: string;
    /**
     * 最新消息时间
     */
    lastMessageTime?: string;
};

