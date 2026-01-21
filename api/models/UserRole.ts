/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 角色实体类
 */
export type UserRole = {
    /**
     * 用户id
     */
    userId: number;
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
     * 角色状态,0正常,1删除
     */
    state?: number;
    /**
     * 角色类型,0:角色,1:骰娘,2:NPC
     */
    type: number;
    /**
     * 空间id（NPC 绑定空间；非NPC可为空）
     */
    spaceId?: number;
    /**
     * tts时使用的模型
     */
    modelName?: string;
    /**
     * tts时使用的角色名
     */
    speakerName?: string;
    voiceUrl?: string;
    /**
     * 角色扩展属性
     */
    extra?: Record<string, string>;
    createTime?: string;
    updateTime?: string;
    role?: boolean;
    diceMaiden?: boolean;
};

