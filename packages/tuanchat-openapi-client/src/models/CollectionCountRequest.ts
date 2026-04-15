/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 收藏计数查询请求参数
 */
export type CollectionCountRequest = {
    /**
     * 资源ID列表
     */
    resourceIds: Array<number>;
    /**
     * 资源类型(1-feed, 2-post, 3-repository等)
     */
    resourceType: string;
};

