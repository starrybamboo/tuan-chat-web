/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 消息会话
 */
export type MessageSession = {
    /**
     * 主键ID
     */
    id?: number;
    /**
     * 房间ID
     */
    roomId?: number;
    /**
     * 用户ID
     */
    userId?: number;
    /**
     * 最后已读消息的sync_id
     */
    lastReadSyncId?: number;
    createTime?: string;
    updateTime?: string;
};

