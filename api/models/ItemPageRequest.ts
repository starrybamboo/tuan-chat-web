/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ItemPageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 可选，用于筛选特定类型的物品
     */
    type?: string;
    /**
     * 可选，用于筛选特定规则下的物品
     */
    ruleId?: number;
};

