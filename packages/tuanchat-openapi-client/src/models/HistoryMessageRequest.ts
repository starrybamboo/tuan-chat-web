/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 统一读取房间消息历史的请求；syncId=0 表示完整 baseline，syncId>0 表示补洞
 */
export type HistoryMessageRequest = {
    /**
     * 房间ID
     */
    roomId: number;
    /**
     * 消息同步ID；0 表示完整 baseline，非 0 时返回大于或等于此 ID 的消息
     */
    syncId: number;
    /**
     * Commit ID (optional, archive snapshot)
     */
    commitId?: number;
};
