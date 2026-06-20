/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultWebgalPublishJobStatusResponse } from '../models/ApiResultWebgalPublishJobStatusResponse';
import type { WebgalPublishRequest } from '../models/WebgalPublishRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WebgalPublishControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 发起 Galgame 发布到 Cloudflare Pages
     * @param requestBody
     * @returns ApiResultWebgalPublishJobStatusResponse OK
     * @throws ApiError
     */
    public start(
        requestBody: WebgalPublishRequest,
    ): CancelablePromise<ApiResultWebgalPublishJobStatusResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/webgal/publish',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 查询 Galgame 发布状态
     * @param jobId
     * @returns ApiResultWebgalPublishJobStatusResponse OK
     * @throws ApiError
     */
    public status(
        jobId: string,
    ): CancelablePromise<ApiResultWebgalPublishJobStatusResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/webgal/publish/{jobId}',
            path: {
                'jobId': jobId,
            },
        });
    }
}
