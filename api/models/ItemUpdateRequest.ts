/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 更新物品请求
 */
export type ItemUpdateRequest = {
    /**
     * 物品ID
     */
    itemId: number;
    /**
     * 物品名称
     */
    name?: string;
    /**
     * 物品描述
     */
    description?: string;
    /**
     * 物品的不同信息，更新时null代表删除这个字段
     */
    extra?: Record<string, string>;
    /**
     * 类型
     */
    type?: string;
    /**
     * 物品图片
     */
    image?: string;
};

