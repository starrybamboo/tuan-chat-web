/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListMessageSessionResponse } from '../models/ApiResultListMessageSessionResponse';
import type { ApiResultMessageSessionResponse } from '../models/ApiResultMessageSessionResponse';
import type { SessionReadUpdateRequest } from '../models/SessionReadUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class MessageSessionService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 取消订阅房间
     * @param roomId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public unsubscribeRoom(
        roomId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/session/unsubscribe',
            query: {
                'roomId': roomId,
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
     * 订阅房间
     * @param roomId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public subscribeRoom(
        roomId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/session/subscribe',
            query: {
                'roomId': roomId,
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
     * 更新已读位置
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public updateReadPosition(
        requestBody: SessionReadUpdateRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/session/read',
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
     * 获取用户在指定房间的会话信息
     * @param roomId
     * @returns ApiResultMessageSessionResponse OK
     * @throws ApiError
     */
    public getRoomSession(
        roomId: number,
    ): CancelablePromise<ApiResultMessageSessionResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/chat/session/room',
            query: {
                'roomId': roomId,
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
     * 获取用户的所有会话列表
     * @returns ApiResultListMessageSessionResponse OK
     * @throws ApiError
     */
    public getUserSessions(): CancelablePromise<ApiResultListMessageSessionResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/chat/session/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
