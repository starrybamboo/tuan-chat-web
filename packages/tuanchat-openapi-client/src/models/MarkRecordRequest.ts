/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 标记操作请求
 */
export type MarkRecordRequest = {
    /**
     * 目标ID
     */
    targetId: number;
    /**
     * 目标类型
     */
    targetType: string;
    /**
     * 标记类型：like/collect
     */
    markType: MarkRecordRequest.markType;
};
export namespace MarkRecordRequest {
    /**
     * 标记类型：like/collect
     */
    export enum markType {
        LIKE = 'like',
        COLLECT = 'collect',
    }
}

