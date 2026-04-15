/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 资源分页查询请求
 */
export type ResourcePageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 资源类型，不传则查询所有类型
     */
    type?: string;
};

