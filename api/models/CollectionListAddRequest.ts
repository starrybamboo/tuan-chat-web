/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 创建收藏列表请求
 */
export type CollectionListAddRequest = {
    /**
     * 列表名称
     */
    collectionListName: string;
    /**
     * 列表描述
     */
    description?: string;
    /**
     * 是否公开：0-私有，1-公开
     */
    isPublic?: boolean;
    /**
     * 列表封面图片
     */
    coverImageUrl?: string;
};

