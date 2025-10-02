/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 用户收藏表
 */
export type Collection = {
    /**
     * 收藏ID
     */
    collectionId?: number;
    /**
     * 用户ID
     */
    userId?: number;
    /**
     * 资源ID
     */
    resourceId?: number;
    /**
     * 资源类型
     */
    resourceType?: string;
    /**
     * 用户收藏注释
     */
    comment?: string;
    /**
     * 逻辑删除
     */
    isDeleted?: boolean;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

