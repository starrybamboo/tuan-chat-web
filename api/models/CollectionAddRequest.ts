/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 添加收藏请求
 */
export type CollectionAddRequest = {
    /**
     * 资源ID
     */
    resourceId: number;
    /**
     * 资源类型
     */
    resourceType: number; //实际上是byte
    /**
     * 用户收藏注释
     */
    comment?: string;
};

