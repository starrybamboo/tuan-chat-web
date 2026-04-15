/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NovelApiAnnotateImageRequest } from '../models/NovelApiAnnotateImageRequest';
import type { NovelApiAugmentImageRequest } from '../models/NovelApiAugmentImageRequest';
import type { NovelApiGenerateImageRequest } from '../models/NovelApiGenerateImageRequest';
import type { NovelApiUpscaleImageRequest } from '../models/NovelApiUpscaleImageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class NovelApiProxyControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * NovelAI 放大代理
     * 透传请求到 NovelAI /ai/upscale 并回传二进制结果
     * @param requestBody
     * @param accept
     * @returns string OK
     * @throws ApiError
     */
    public upscaleImage(
        requestBody: NovelApiUpscaleImageRequest,
        accept?: string,
    ): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/novelapi/ai/upscale',
            headers: {
                'Accept': accept,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * NovelAI 生图代理
     * 透传请求到 NovelAI /ai/generate-image 并回传二进制结果
     * @param requestBody
     * @param accept
     * @returns string OK
     * @throws ApiError
     */
    public generateImage(
        requestBody: NovelApiGenerateImageRequest,
        accept?: string,
    ): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/novelapi/ai/generate-image',
            headers: {
                'Accept': accept,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * NovelAI 导演工具代理
     * 透传请求到 NovelAI /ai/augment-image 并回传二进制结果
     * @param requestBody
     * @param accept
     * @returns string OK
     * @throws ApiError
     */
    public augmentImage(
        requestBody: NovelApiAugmentImageRequest,
        accept?: string,
    ): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/novelapi/ai/augment-image',
            headers: {
                'Accept': accept,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * NovelAI 控制图代理
     * 透传请求到 NovelAI /ai/annotate-image 并回传二进制结果
     * @param requestBody
     * @param accept
     * @returns string OK
     * @throws ApiError
     */
    public annotateImage(
        requestBody: NovelApiAnnotateImageRequest,
        accept?: string,
    ): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/novelapi/ai/annotate-image',
            headers: {
                'Accept': accept,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
