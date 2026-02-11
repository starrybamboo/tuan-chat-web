/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 仓库查询翻页请求
 */
export type RepositoryPageByUserRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 查询的用户ID
     */
    userId: number;
};

