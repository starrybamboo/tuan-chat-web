/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultTutorialBootstrapResponse } from '../models/ApiResultTutorialBootstrapResponse';
import type { ApiResultTutorialPullResponse } from '../models/ApiResultTutorialPullResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceTutorialControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 拉取最新新手教程（新建并删除旧教程空间）
     * @returns ApiResultTutorialPullResponse OK
     * @throws ApiError
     */
    public pullLatestTutorial(): CancelablePromise<ApiResultTutorialPullResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/tutorial/pull',
        });
    }
    /**
     * 用户上线后的教程引导检查
     * @returns ApiResultTutorialBootstrapResponse OK
     * @throws ApiError
     */
    public bootstrap(): CancelablePromise<ApiResultTutorialBootstrapResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/tutorial/bootstrap',
        });
    }
}
