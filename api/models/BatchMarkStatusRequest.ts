/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarkTarget } from './MarkTarget';
/**
 * 批量标记状态查询请求
 */
export type BatchMarkStatusRequest = {
    /**
     * 标记类型：like/collect
     */
    markType: BatchMarkStatusRequest.markType;
    /**
     * 目标列表
     */
    targets: Array<MarkTarget>;
};
export namespace BatchMarkStatusRequest {
    /**
     * 标记类型：like/collect
     */
    export enum markType {
        LIKE = 'like',
        COLLECT = 'collect',
    }
}

