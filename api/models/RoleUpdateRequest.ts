/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 更新角色请求体
 */
export type RoleUpdateRequest = {
    /**
     * 角色id
     */
    roleId: number;
    /**
     * 角色名字
     */
    roleName?: string;
    /**
     * 简介
     */
    description?: string;
    /**
     * 角色头像
     */
    avatarId?: number;
    /**
     * tts时使用的模型
     */
    modelName?: string;
    /**
     * tts时使用的角色名
     */
    speakerName?: string;
};

