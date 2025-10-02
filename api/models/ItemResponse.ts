/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 物品信息
 */
export type ItemResponse = {
    /**
     * 物品ID
     */
    itemId?: number;
    /**
     * 规则ID
     */
    ruleId?: number;
    /**
     * 物品名称
     */
    name?: string;
    /**
     * 物品描述
     */
    description?: string;
    /**
     * 物品的不同信息，具体字段由type决定
     */
    extra?: Record<string, string>;
    /**
     * 物品的类型
     */
    type?: string;
    /**
     * 物品图片
     */
    image?: string;
};

