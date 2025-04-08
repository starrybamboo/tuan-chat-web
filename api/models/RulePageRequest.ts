/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 规则分页查询请求
 */
export type RulePageRequest = {
    /**
     * 页面大小
     */
    pageSize?: number;
    /**
     * 页面索引（从1开始）
     */
    pageNo?: number;
    /**
     * 搜索关键词（可选）
     */
    keyword?: string;
    ruleId: number;
};

