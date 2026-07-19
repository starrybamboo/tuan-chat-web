/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Space } from './Space';
/**
 * 用户空间集合的基线或增量同步响应
 */
export type SpaceCollectionSyncResponse = {
    /**
     * 是否为完整基线
     */
    baseline?: boolean;
    /**
     * 本次响应使用的最新同步 ID
     */
    latestSyncId?: number;
    /**
     * 空间变更；每项通过 syncOperation 区分 UPSERT 和 DELETE
     */
    spaces?: Array<Space>;
};
