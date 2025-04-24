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
import type { MoveMessageRequest } from '../models/MoveMessageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新消息
     * 只要有更新都走这个接口
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
     * 发送消息（备用）
     * 从设计上是为了弱网环境的处理，但实际上没怎么用
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
     * 删除消息
     * 只要有更新都走这个接口
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteMessage(
        requestBody: Message,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
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
     * 移动消息位置
     * 根据beforeMessageId和afterMessageId自动判断移动类型：当都为null时返回错误，beforeMessageId在这条消息之前的id ，就是 beforeMessageId messageId afterMessageId
     * @param requestBody
     * @returns ApiResultMessage OK
     * @throws ApiError
     */
    public moveMessage(
        requestBody: MoveMessageRequest,
    ): CancelablePromise<ApiResultMessage> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/chat/message/move',
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
     * 按页获取消息列表
     * 用的是游标翻页
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
     * 发送消息（备用）,骰娘回复
     * 从设计上是为了弱网环境的处理，但实际上没怎么用
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public sendMessageAiResponse(
        requestBody: ChatMessageRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/chat/message/ai',
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
     * 获取一个群的所有消息
     * 根据 position 降序排序
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
