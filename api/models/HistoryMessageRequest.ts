/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 根据房间ID和syncId获取历史消息的请求
 */
export type HistoryMessageRequest = {
    /**
     * 房间ID
     */
    roomId: number;
    /**
     * 消息同步ID，返回大于或等于此ID的消息
     */
    syncId: number;
    /**
     * Commit ID (optional, archive snapshot)
     */
    commitId?: number;
};

