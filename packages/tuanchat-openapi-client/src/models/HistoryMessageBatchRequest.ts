/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 多个房间的消息历史批量查询请求
 */
export type HistoryMessageBatchRequest = {
    /**
     * 房间 ID 列表，最多 100 个
     */
    roomIds: Array<number>;
    /**
     * 消息同步 ID；0 表示完整 baseline
     */
    syncId: number;
    /**
     * Commit ID（可选）
     */
    commitId?: number;
};
