/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
     * 1 在线 2离线
     */
    activeStatus?: string;
    /**
     * 最后一次上下线时间
     */
    lastLoginTime?: string;
};

