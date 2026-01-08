/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultString } from '../models/ApiResultString';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DatabaseBackupService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 手动触发数据库备份（用于测试）
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public triggerBackup(): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backup/trigger',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
