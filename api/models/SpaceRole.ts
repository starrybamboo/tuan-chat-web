/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 空间角色映射
 */
export type SpaceRole = {
    /**
     * 空间id
     */
    spaceId?: number;
    /**
     * 角色id（历史字段名 stage_entity_id）
     */
    roleId?: number;
    /**
     * 添加该角色到空间的用户id
     */
    userId?: number;
    /**
     * 角色类型（复用 role.type）：0角色，1骰娘，2NPC（历史：space_role 仅用于 NPC 映射）
     */
    type?: number;
    createTime?: string;
    updateTime?: string;
};

