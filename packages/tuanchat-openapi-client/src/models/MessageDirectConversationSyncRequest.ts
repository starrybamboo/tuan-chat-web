/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 私聊会话同步请求
 */
export type MessageDirectConversationSyncRequest = {
    /**
     * 对话用户ID
     */
    targetUserId: number;
    /**
     * 已确认的会话 syncId；0 表示请求完整基线
     */
    syncId?: number;
};
