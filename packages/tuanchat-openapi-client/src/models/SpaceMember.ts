/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * SpaceMember对象
 */
export type SpaceMember = {
    /**
     * 空间id
     */
    spaceId?: number;
    /**
     * 用户id
     */
    userId?: number;
    /**
     * 成员类型 1裁判 2玩家 3观战
     */
    memberType?: number;
    /**
     * 用户名
     */
    username?: string;
    /**
     * 头像媒体文件 ID
     */
    avatarFileId?: number;
    /**
     * 头像媒体类型
     */
    avatarMediaType?: string;
    createTime?: string;
    updateTime?: string;
};

