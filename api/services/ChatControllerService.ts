/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultChatMessageResponse } from '../models/ApiResultChatMessageResponse';
import type { ApiResultCursorPageBaseResponseChatMessageResponse } from '../models/ApiResultCursorPageBaseResponseChatMessageResponse';
import type { ApiResultListMessage } from '../models/ApiResultListMessage';
import type { ApiResultMessage } from '../models/ApiResultMessage';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ChatMessagePageRequest } from '../models/ChatMessagePageRequest';
import type { ChatMessageRequest } from '../models/ChatMessageRequest';
import type { HistoryMessageRequest } from '../models/HistoryMessageRequest';
import type { Message } from '../models/Message';
import type { MessageBySyncIdRequest } from '../models/MessageBySyncIdRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 批量更新消息
     * 一次性更新多条消息
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public batchUpdateMessages(
        requestBody: Array<Message>,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/chat/messages/batch',
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
     * 根据ID获取单条消息
     * 返回指定ID的消息详情
     * @param messageId
     * @returns ApiResultChatMessageResponse OK
     * @throws ApiError
     */
    public getMessageById(
        messageId: number,
    ): CancelablePromise<ApiResultChatMessageResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/chat/message',
            query: {
                'messageId': messageId,
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
            url: '/chat/message',
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
     * @returns ApiResultMessage OK
     * @throws ApiError
     */
    public sendMessage1(
        requestBody: ChatMessageRequest,
    ): CancelablePromise<ApiResultMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/message',
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
     * @returns ApiResultMessage OK
     * @throws ApiError
     */
    public deleteMessage(
        requestBody: number,
    ): CancelablePromise<ApiResultMessage> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/chat/message',
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
     * 根据syncId获取单条消息
     * 用于在收到syncId间隔的消息时，重新获取缺失的消息
     * @param requestBody
     * @returns ApiResultChatMessageResponse OK
     * @throws ApiError
     */
    public getMessageBySyncId(
        requestBody: MessageBySyncIdRequest,
    ): CancelablePromise<ApiResultChatMessageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/message/sync',
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
            url: '/chat/message/page',
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
     * 获取历史消息
     * 返回房间下syncId大于等于请求中syncId的消息，返回gzip压缩的数据
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public getHistoryMessages(
        requestBody: HistoryMessageRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/message/history',
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
     * 根据 position 降序排序，返回gzip压缩的数据
     * @param roomId
     * @returns any OK
     * @throws ApiError
     */
    public getAllMessage(
        roomId: number,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/chat/message/all',
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
