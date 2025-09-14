/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 数据列表
 */
export type RoleResponse = {
    /**
     * 角色id
     */
    roleId?: number;
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
    /**
     * tts时使用的音色
     */
    voiceUrl?: string;
    /**
     * 属于哪个用户，0代表是全局角色
     */
    userId?: number;
};

