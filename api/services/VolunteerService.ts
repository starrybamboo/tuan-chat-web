/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultMapStringObject } from '../models/ApiResultMapStringObject';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class VolunteerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取志愿者统计信息
     * @returns ApiResultMapStringObject OK
     * @throws ApiError
     */
    public getStatistics(): CancelablePromise<ApiResultMapStringObject> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/volunteer/statistics',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
