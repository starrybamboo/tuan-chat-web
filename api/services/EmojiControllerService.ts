/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultEmoji } from '../models/ApiResultEmoji';
import type { ApiResultListEmoji } from '../models/ApiResultListEmoji';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { EmojiCreateRequest } from '../models/EmojiCreateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class EmojiControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 根据ID获取表情包
     * @param emojiId
     * @returns ApiResultEmoji OK
     * @throws ApiError
     */
    public getEmoji(
        emojiId: number,
    ): CancelablePromise<ApiResultEmoji> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/emoji',
            query: {
                'emojiId': emojiId,
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
     * 创建表情包
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public createEmoji(
        requestBody: EmojiCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/emoji',
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
     * @param emojiId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteEmoji(
        emojiId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/emoji',
            query: {
                'emojiId': emojiId,
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
     * @returns ApiResultListEmoji OK
     * @throws ApiError
     */
    public getUserEmojis(): CancelablePromise<ApiResultListEmoji> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/emoji/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
