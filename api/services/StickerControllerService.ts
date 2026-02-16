/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListSticker } from '../models/ApiResultListSticker';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { StickerCreateRequest } from '../models/StickerCreateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class StickerControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 创建表情包
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public createSticker(
        requestBody: StickerCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/sticker',
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
     * 删除表情包
     * @param stickerId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteSticker(
        stickerId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/sticker',
            query: {
                'stickerId': stickerId,
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
     * 获取用户表情包列表
     * @returns ApiResultListSticker OK
     * @throws ApiError
     */
    public getUserStickers(): CancelablePromise<ApiResultListSticker> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/sticker/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
