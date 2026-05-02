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
     * 头像媒体文件 ID
     */
    avatarFileId?: number;
    /**
     * 头像媒体类型
     */
    avatarMediaType?: string;
    /**
     * 1 在线 0 离线
     */
    activeStatus?: string;
};

