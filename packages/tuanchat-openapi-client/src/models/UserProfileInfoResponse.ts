/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type UserProfileInfoResponse = {
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
    /**
     * 用户描述信息,个人签名
     */
    description?: string;
    /**
     * 性别: 隐藏(null) 男 女
     */
    gender?: string;
    /**
     * 公开扩展字段，JSON 格式（例如 gnsPreference）
     */
    extra?: Record<string, Record<string, any>>;
};

