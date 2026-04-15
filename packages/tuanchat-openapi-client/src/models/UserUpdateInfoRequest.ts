/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 用户信息更新请求
 */
export type UserUpdateInfoRequest = {
    /**
     * 用户ID
     */
    userId: number;
    /**
     * 用户名
     */
    username?: string;
    /**
     * 头像URL
     */
    avatar?: string;
    /**
     * 头像缩略图URL
     */
    avatarThumbUrl?: string;
    /**
     * 用户描述信息,个人签名
     */
    description?: string;
    /**
     * 性别: 隐藏(null) 男 女
     */
    gender?: string;
    /**
     * 扩展字段，JSON 格式
     */
    extra?: Record<string, Record<string, any>>;
};

