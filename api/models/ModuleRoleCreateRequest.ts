/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 模组角色创建请求
 */
export type ModuleRoleCreateRequest = {
    /**
     * 模组id
     */
    moduleId: number;
    /**
     * 角色id
     */
    roleId: number;
    /**
     * 角色类型 (0: 玩家角色预设卡 1: npc)
     */
    type: number;
};

