/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultSchedulerStatistics } from '../models/ApiResultSchedulerStatistics';
import type { ApiResultString } from '../models/ApiResultString';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DistributedTaskSchedulerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 手动触发任务调度
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public triggerScheduling(): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/scheduler/trigger',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 获取调度器统计信息
     * @returns ApiResultSchedulerStatistics OK
     * @throws ApiError
     */
    public getStatistics1(): CancelablePromise<ApiResultSchedulerStatistics> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/scheduler/statistics',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
