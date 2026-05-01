/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 资源响应
 */
export type ResourceResponse = {
    /**
     * 资源id
     */
    resourceId?: number;
    /**
     * 收藏id
     */
    collectionId?: number;
    /**
     * 资源类型
     */
    type?: string;
    /**
     * 资源类型描述
     */
    typeDescription?: string;
    /**
     * 资源媒体文件 ID
     */
    fileId?: number;
    /**
     * 资源媒体类型
     */
    mediaType?: string;
    /**
     * 资源名称
     */
    name?: string;
    /**
     * 上传用户
     */
    userId?: number;
    /**
     * 用户名
     */
    username?: string;
    /**
     * 上传用户头像媒体文件 ID
     */
    avatarFileId?: number;
    /**
     * 上传用户头像媒体类型
     */
    avatarMediaType?: string;
    /**
     * 是不是ai
     */
    isAi?: boolean;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 是不是公开
     */
    isPublic?: boolean;
};

