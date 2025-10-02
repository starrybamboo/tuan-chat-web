/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultModuleInfo } from '../models/ApiResultModuleInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CommitControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param moduleId
     * @param branchId
     * @returns ApiResultModuleInfo OK
     * @throws ApiError
     */
    public getModuleInfo(
        moduleId: number,
        branchId?: number,
    ): CancelablePromise<ApiResultModuleInfo> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/module/commit',
            query: {
                'moduleId': moduleId,
                'branchId': branchId,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * @param commitId
     * @returns ApiResultModuleInfo OK
     * @throws ApiError
     */
    public getModuleInfoByCommitId(
        commitId: number,
    ): CancelablePromise<ApiResultModuleInfo> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/module/commit/info',
            query: {
                'commitId': commitId,
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
