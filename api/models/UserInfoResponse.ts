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
     * 用户的当前状态 active offline busy away
     */
    activeStatus?: string;
    /**
     * 最后一次下线时间
     */
    lastLoginTime?: string;
    /**
     * 用户的个人描述
     */
    description?: string,
    /**
     * 用户背景图url
     */
    backgroundUrl?: string,
    gender?: string,
};

