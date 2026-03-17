/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 父评论作者信息
 */
export type UserInfoResponse = {
    /**
     * 用户的uid，全局唯一
     */
    userId: number;
    username?: string;
    /**
     * 头像的url
     */
    avatar?: string;
    /**
     * 头像缩略图的url
     */
    avatarThumbUrl?: string;
    /**
     * 1 在线 0 离线
     */
    activeStatus?: string;
};

