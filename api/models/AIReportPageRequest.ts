/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * AI报告分页查询请求
 */
export type AIReportPageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 空间ID
     */
    spaceId?: number;
    /**
     * 报告类型：1-PL，2-KP，3-共享
     */
    reportType?: string;
};

