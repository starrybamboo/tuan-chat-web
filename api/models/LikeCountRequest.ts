/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 点赞计数查询请求参数
 */
export type LikeCountRequest = {
    /**
     * 目标内容ID列表
     */
    targetIds: Array<number>;
    /**
     * 目标类型(1-feed, 2-post, 3-repository等)
     */
    targetType: string;
};

