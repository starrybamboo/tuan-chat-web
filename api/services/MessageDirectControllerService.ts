/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListMessageDirectResponse } from '../models/ApiResultListMessageDirectResponse';
import type { ApiResultMessageDirectResponse } from '../models/ApiResultMessageDirectResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { MessageDirectReadUpdateRequest } from '../models/MessageDirectReadUpdateRequest';
import type { MessageDirectRecallRequest } from '../models/MessageDirectRecallRequest';
import type { MessageDirectSendRequest } from '../models/MessageDirectSendRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class MessageDirectControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新私聊已读位置
     * 插入消息已读线，并删除之前的已读线
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public updateReadPosition(
        requestBody: MessageDirectReadUpdateRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/message/direct/updateReadPosition',
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
        requestBody: MessageDirectRecallRequest,
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
     * 获取收件箱消息全量数据
     * 拉取当前用户收件箱从最新消息到指定cursor位置的所有消息
     * @param requestBody
     * @returns ApiResultListMessageDirectResponse OK
     * @throws ApiError
     */
    public getInboxMessages(
        requestBody?: string,
    ): CancelablePromise<ApiResultListMessageDirectResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/message/direct/inbox',
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
