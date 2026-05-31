/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultChatMessageResponse } from '../models/ApiResultChatMessageResponse';
import type { ApiResultListMessage } from '../models/ApiResultListMessage';
import type { ApiResultMessage } from '../models/ApiResultMessage';
import type { ChatMessageRequest } from '../models/ChatMessageRequest';
import type { HistoryMessageRequest } from '../models/HistoryMessageRequest';
import type { Message } from '../models/Message';
import type { RoomMessageStreamPatchRequest } from '../models/RoomMessageStreamPatchRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
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
        });
    }
    /**
     * 发送单条消息
     * 创建一条房间消息并返回持久化后的消息
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
        });
    }
    /**
     * 复合批量变更消息
     * 按 insert/update/delete/move 操作一次性变更指定房间消息
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public patchRoomMessages(
        requestBody: RoomMessageStreamPatchRequest,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/message/patch',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 统一读取房间消息历史
     * 主读取入口：syncId=0 返回完整 baseline，syncId>0 用于补洞；返回 gzip 压缩数据
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
        });
    }
    /**
     * 根据syncId获取单条消息
     * 用于在收到syncId间隔的消息时，重新获取缺失的消息
     * @param roomId
     * @param syncId
     * @returns ApiResultChatMessageResponse OK
     * @throws ApiError
     */
    public getMessageBySyncId(
        roomId: number,
        syncId: number,
    ): CancelablePromise<ApiResultChatMessageResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/chat/message/sync',
            query: {
                'roomId': roomId,
                'syncId': syncId,
            },
        });
    }
}
