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
     * 角色头像媒体文件 ID
     */
    avatarFileId?: number;
    /**
     * 角色头像媒体类型
     */
    avatarMediaType?: string;
    /**
     * 空间id（NPC 绑定空间）
     */
    spaceId?: number;
    /**
     * 角色状态,0正常,1删除
     */
    state?: number;
    /**
     * 角色类型,0:角色,1:骰娘,2:NPC
     */
    type: number;
    voiceUrl?: string;
    /**
     * 角色语音媒体文件 ID
     */
    voiceFileId?: number;
    /**
     * 角色扩展属性
     */
    extra?: Record<string, string>;
    /**
     * 继承来源的归档角色ID
     */
    inheritedArchiveRoleId?: number;
    /**
     * 版本状态
     */
    versionState?: number;
    createTime?: string;
    updateTime?: string;
    role?: boolean;
    npc?: boolean;
    diceMaiden?: boolean;
};

