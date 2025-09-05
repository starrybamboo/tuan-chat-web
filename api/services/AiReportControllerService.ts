/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AIReportPageRequest } from '../models/AIReportPageRequest';
import type { ApiResultAIReportResponse } from '../models/ApiResultAIReportResponse';
import type { ApiResultPageBaseRespAIReportResponse } from '../models/ApiResultPageBaseRespAIReportResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiReportControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 分页查询用户报告
     * @param requestBody
     * @returns ApiResultPageBaseRespAIReportResponse OK
     * @throws ApiError
     */
    public getUserReports(
        requestBody: AIReportPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespAIReportResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/ai/report/page',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取报告详情
     * @param reportId 报告ID
     * @returns ApiResultAIReportResponse OK
     * @throws ApiError
     */
    public getReportDetail(
        reportId: number,
    ): CancelablePromise<ApiResultAIReportResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/ai/report/detail/{reportId}',
            path: {
                'reportId': reportId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
