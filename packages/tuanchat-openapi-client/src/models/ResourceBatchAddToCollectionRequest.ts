/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 批量添加资源到收藏集请求
 */
export type ResourceBatchAddToCollectionRequest = {
    /**
     * 收藏集ID
     */
    collectionListId: number;
    /**
     * 资源类型
     */
    resourceType: string;
    /**
     * 资源ID列表
     */
    resourceIds: Array<number>;
};

