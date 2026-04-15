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
     * 头像 URL
     */
    avatar?: string;
    /**
     * 头像缩略图 URL
     */
    avatarThumbUrl?: string;
    createTime?: string;
    updateTime?: string;
};

