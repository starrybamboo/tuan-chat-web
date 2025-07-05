/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultCursorPageBaseResponseMessageDirectResponse } from '../models/ApiResultCursorPageBaseResponseMessageDirectResponse';
import type { ApiResultMessageDirectResponse } from '../models/ApiResultMessageDirectResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { CursorPageBaseRequest } from '../models/CursorPageBaseRequest';
import type { MessageDirectPageRequest } from '../models/MessageDirectPageRequest';
import type { MessageDirectSendRequest } from '../models/MessageDirectSendRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class MessageDirectControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 发送私聊消息
     * @param requestBody
     * @returns ApiResultMessageDirectResponse OK
     * @throws ApiError
     */
    public sendMessage(
        requestBody: MessageDirectSendRequest,
    ): CancelablePromise<ApiResultMessageDirectResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/message/direct/send',
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
     * 撤回消息
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public recallMessage(
        requestBody: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/message/direct/recall',
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
     * 分页查询会话消息
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseMessageDirectResponse OK
     * @throws ApiError
     */
    public getMessagePage(
        requestBody: MessageDirectPageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseMessageDirectResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/message/direct/page',
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
     * 获取收件箱消息分页
     * 获取收件箱消息分页
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseMessageDirectResponse OK
     * @throws ApiError
     */
    public getInboxMessagePage(
        requestBody: CursorPageBaseRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseMessageDirectResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/message/direct/inbox/page',
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
