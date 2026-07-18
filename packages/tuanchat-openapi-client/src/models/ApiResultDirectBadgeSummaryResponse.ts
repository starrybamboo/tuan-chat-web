/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DirectBadgeSummaryResponse } from './DirectBadgeSummaryResponse';
/**
 * 基础返回体
 */
export type ApiResultDirectBadgeSummaryResponse = {
    /**
     * 成功标识true or false
     */
    success: boolean;
    /**
     * 错误码
     */
    errCode?: number;
    /**
     * 错误消息
     */
    errMsg?: string;
    /**
     * 返回对象
     */
    data?: DirectBadgeSummaryResponse;
};
