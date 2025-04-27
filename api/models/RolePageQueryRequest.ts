/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 查询用户信息翻页请求
 */
export type RolePageQueryRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 请求用户id
     */
    userId?: number;
    /**
     * 角色名称，支持模糊查询
     */
    roleName?: string;
};

