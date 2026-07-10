/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultMediaCompleteUploadResponse } from '../models/ApiResultMediaCompleteUploadResponse';
import type { ApiResultMediaPrepareUploadResponse } from '../models/ApiResultMediaPrepareUploadResponse';
import type { MediaCompleteUploadRequest } from '../models/MediaCompleteUploadRequest';
import type { MediaPrepareUploadRequest } from '../models/MediaPrepareUploadRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class MediaControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 完成媒体单例上传
     * @param sessionId
     * @param requestBody
     * @returns ApiResultMediaCompleteUploadResponse OK
     * @throws ApiError
     */
    public completeUpload(
        sessionId: number,
        requestBody?: MediaCompleteUploadRequest,
    ): CancelablePromise<ApiResultMediaCompleteUploadResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/media/upload-sessions/{sessionId}/complete',
            path: {
                'sessionId': sessionId,
            },
            body: requestBody,
            mediaType: 'application/json',
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
}
