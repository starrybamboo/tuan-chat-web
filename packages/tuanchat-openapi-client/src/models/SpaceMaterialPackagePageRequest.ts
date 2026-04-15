/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 局内素材包分页查询请求
 */
export type SpaceMaterialPackagePageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 空间ID
     */
    spaceId: number;
    /**
     * 按名称模糊搜索
     */
    keyword?: string;
};

