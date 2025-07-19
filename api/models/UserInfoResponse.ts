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
     * 1 在线 0 离线
     */
    activeStatus?: string;
    /**
     * 最后一次上下线时间
     */
    lastLoginTime?: string;
    /**
     * 用户描述信息,个人签名
     */
    description?: string;
    /**
     * 用户背景图的url
     */
    backgroundUrl?: string;
    /**
     * 性别: 隐藏(null) 男 女
     */
    gender?: string;
    readMe?: string;
};

