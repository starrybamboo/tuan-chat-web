/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultOssResp } from '../models/ApiResultOssResp';
import type { UploadUrlRequest } from '../models/UploadUrlRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class OssControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param requestBody
     * @returns ApiResultOssResp OK
     * @throws ApiError
     */
    public getUploadUrl(
        requestBody: UploadUrlRequest,
    ): CancelablePromise<ApiResultOssResp> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/oss/upload/url',
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
}
