/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * AI报告响应
 */
export type AIReportResponse = {
    /**
     * 报告ID
     */
    id?: number;
    /**
     * 空间ID
     */
    spaceId?: number;
    /**
     * 用户ID
     */
    userId?: number;
    /**
     * 报告类型：1-PL，2-KP，3-共享
     */
    reportType?: string;
    /**
     * 共享报告ID
     */
    sharedReportId?: number;
    /**
     * 个人报告内容JSON
     */
    privateContent?: string;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

