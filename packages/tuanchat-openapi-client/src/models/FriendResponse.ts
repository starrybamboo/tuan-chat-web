/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 好友信息响应
 */
export type FriendResponse = {
    /**
     * 好友用户ID
     */
    userId?: number;
    /**
     * 好友用户名
     */
    username?: string;
    /**
     * 好友头像
     */
    avatar?: string;
    /**
     * 1 在线 0 离线
     */
    activeStatus?: string;
    /**
     * 最后一次上下线时间
     */
    lastLoginTime?: string;
};

