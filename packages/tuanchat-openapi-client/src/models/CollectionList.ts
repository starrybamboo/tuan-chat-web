/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 收藏列表表
 */
export type CollectionList = {
    /**
     * 列表ID
     */
    collectionListId?: number;
    /**
     * 创建者ID
     */
    userId?: number;
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
    /**
     * 列表名称
     */
    collectionListName?: string;
    /**
     * 列表描述
     */
    description?: string;
    /**
     * 是否公开：0-私有，1-公开
     */
    isPublic?: boolean;
    /**
     * 逻辑删除
     */
    isDeleted?: boolean;
    /**
     * 资源列表类型
     */
    resourceListType?: string;
    /**
     * 列表封面图片
     */
    coverImageUrl?: string;
    /**
     * 列表封面原图
     */
    originalCoverImageUrl?: string;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

