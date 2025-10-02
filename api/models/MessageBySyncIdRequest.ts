/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 根据房间ID和syncId获取单条消息的请求
 */
export type MessageBySyncIdRequest = {
    /**
     * 房间ID
     */
    roomId: number;
    /**
     * 消息同步ID
     */
    syncId: number;
};

