/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultCursorPageBaseResponseChatMessageResponse } from '../models/ApiResultCursorPageBaseResponseChatMessageResponse';
import type { ApiResultListChatMessageResponse } from '../models/ApiResultListChatMessageResponse';
import type { ApiResultMessage } from '../models/ApiResultMessage';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ChatMessagePageRequest } from '../models/ChatMessagePageRequest';
import type { ChatMessageRequest } from '../models/ChatMessageRequest';
import type { Message } from '../models/Message';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param requestBody
     * @returns ApiResultMessage OK
     * @throws ApiError
     */
    public updateMessage(
        requestBody: Message,
    ): CancelablePromise<ApiResultMessage> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/chat/message',
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
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public sendMessage(
        requestBody: ChatMessageRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/message',
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
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponseChatMessageResponse OK
     * @throws ApiError
     */
    public getMsgPage(
        requestBody: ChatMessagePageRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponseChatMessageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/message/page',
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
     * @param roomId
     * @returns ApiResultListChatMessageResponse OK
     * @throws ApiError
     */
    public getAllMessage(
        roomId: number,
    ): CancelablePromise<ApiResultListChatMessageResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/chat/message/all',
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
}
