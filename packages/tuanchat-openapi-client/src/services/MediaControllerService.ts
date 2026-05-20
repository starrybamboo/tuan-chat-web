/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultMediaCompleteUploadResponse } from '../models/ApiResultMediaCompleteUploadResponse';
import type { ApiResultMediaFileAliasResponse } from '../models/ApiResultMediaFileAliasResponse';
import type { ApiResultMediaPrepareUploadResponse } from '../models/ApiResultMediaPrepareUploadResponse';
import type { MediaFileAliasUpsertRequest } from '../models/MediaFileAliasUpsertRequest';
import type { MediaPrepareUploadRequest } from '../models/MediaPrepareUploadRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class MediaControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 完成媒体单例上传
     * @param sessionId
     * @returns ApiResultMediaCompleteUploadResponse OK
     * @throws ApiError
     */
    public completeUpload(
        sessionId: number,
    ): CancelablePromise<ApiResultMediaCompleteUploadResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/media/upload-sessions/{sessionId}/complete',
            path: {
                'sessionId': sessionId,
            },
        });
    }
    /**
     * 准备媒体单例上传
     * @param requestBody
     * @returns ApiResultMediaPrepareUploadResponse OK
     * @throws ApiError
     */
    public prepareUpload(
        requestBody: MediaPrepareUploadRequest,
    ): CancelablePromise<ApiResultMediaPrepareUploadResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/media/prepare-upload',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 查询媒体文件业务别名（内部使用）
     * @param namespace
     * @param aliasKey
     * @returns ApiResultMediaFileAliasResponse OK
     * @throws ApiError
     */
    public getAlias(
        namespace: string,
        aliasKey: string,
    ): CancelablePromise<ApiResultMediaFileAliasResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/media/aliases',
            query: {
                'namespace': namespace,
                'aliasKey': aliasKey,
            },
        });
    }
    /**
     * 绑定媒体文件业务别名（内部使用）
     * @param requestBody
     * @returns ApiResultMediaFileAliasResponse OK
     * @throws ApiError
     */
    public upsertAlias(
        requestBody: MediaFileAliasUpsertRequest,
    ): CancelablePromise<ApiResultMediaFileAliasResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/media/aliases',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
