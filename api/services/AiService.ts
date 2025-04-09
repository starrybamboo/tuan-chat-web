/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AI_ } from '../models/AI_';
import type { ApiResultMapObjectObject } from '../models/ApiResultMapObjectObject';
import type { ApiResultObject } from '../models/ApiResultObject';
import type { ImageToImageRequest } from '../models/ImageToImageRequest';
import type { TextToImageRequest } from '../models/TextToImageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * AI 根据规则生成角色基本信息
     * 根据规则生成角色基本信息。
     * @param requestBody
     * @returns ApiResultMapObjectObject OK
     * @throws ApiError
     */
    public generateBasicInfoByRule(
        requestBody: AI_,
    ): CancelablePromise<ApiResultMapObjectObject> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/ai/generateBasicInfoByRule',
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
    /**
     * AI 根据规则生成角色基本属性
     * 根据规则生成角色基本属性。
     * @param requestBody
     * @returns ApiResultMapObjectObject OK
     * @throws ApiError
     */
    public generateAbilityByRule(
        requestBody: AI_,
    ): CancelablePromise<ApiResultMapObjectObject> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/ai/generateAbilityByRule',
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
    /**
     * 根据文本生成图像
     * 根据提供的文本描述（包括风格、外貌描述和情感差分）生成图像
     * @param requestBody
     * @returns ApiResultObject OK
     * @throws ApiError
     */
    public textToImage(
        requestBody: TextToImageRequest,
    ): CancelablePromise<ApiResultObject> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/image/textToImage',
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
    /**
     * 图像变换
     * 根据原始图片和情感差分类型生成新的图像变体
     * @param requestBody
     * @returns ApiResultObject OK
     * @throws ApiError
     */
    public imageToImage(
        requestBody: ImageToImageRequest,
    ): CancelablePromise<ApiResultObject> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/image/imageToImage',
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
