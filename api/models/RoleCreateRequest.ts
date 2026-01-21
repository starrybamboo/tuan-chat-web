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
     * 角色类型,0:角色,1:骰娘,2:NPC
     */
    type?: number;
    /**
     * 空间id（NPC 绑定空间；非NPC可为空）
     */
    spaceId?: number;
    /**
     * 角色扩展属性
     */
    extra?: Record<string, string>;
};

