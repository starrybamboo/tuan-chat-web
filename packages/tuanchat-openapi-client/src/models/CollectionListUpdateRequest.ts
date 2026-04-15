/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 更新收藏列表请求
 */
export type CollectionListUpdateRequest = {
    /**
     * 收藏列表ID
     */
    collectionListId: number;
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
     * 资源列表类型
     */
    resourceListType?: string;
    /**
     * 列表封面图片
     */
    coverImageUrl?: string;
};

