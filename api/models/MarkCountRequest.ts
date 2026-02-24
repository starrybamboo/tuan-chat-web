/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 批量标记计数查询请求
 */
export type MarkCountRequest = {
    /**
     * 目标ID列表
     */
    targetIds: Array<number>;
    /**
     * 目标类型
     */
    targetType: string;
    /**
     * 标记类型：like/collect
     */
    markType: MarkCountRequest.markType;
};
export namespace MarkCountRequest {
    /**
     * 标记类型：like/collect
     */
    export enum markType {
        LIKE = 'like',
        COLLECT = 'collect',
    }
}

