/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 创建角色请求体
 */
export type RoleCreateRequest = {
    /**
     * 角色名字
     */
    roleName?: string;
    /**
     * 简介
     */
    description?: string;
    /**
     * 角色类型,0:角色,1:骰娘
     */
    type?: number;
};

