/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PageBaseRespFollowResponse } from './PageBaseRespFollowResponse';
/**
 * 基础返回体
 */
export type ApiResultPageBaseRespFollowResponse = {
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
    data?: PageBaseRespFollowResponse;
};

