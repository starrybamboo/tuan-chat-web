/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultChatMessageResponse } from '../models/ApiResultChatMessageResponse';
import type { ApiResultCursorPageBaseResponseChatMessageResponse } from '../models/ApiResultCursorPageBaseResponseChatMessageResponse';
import type { ApiResultListMessage } from '../models/ApiResultListMessage';
import type { ApiResultMessage } from '../models/ApiResultMessage';
import type { ChatMessagePageRequest } from '../models/ChatMessagePageRequest';
import type { ChatMessageRequest } from '../models/ChatMessageRequest';
import type { HistoryMessageRequest } from '../models/HistoryMessageRequest';
import type { Message } from '../models/Message';
import type { MessageBySyncIdRequest } from '../models/MessageBySyncIdRequest';
import type { RoomMessageStreamPatchRequest } from '../models/RoomMessageStreamPatchRequest';
import type { RoomMessageStreamSyncRequest } from '../models/RoomMessageStreamSyncRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ChatControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取房间消息列表
     * 返回指定 room 当前完整运行态消息列表；文档视图与普通聊天室读取同一套 room/message
     * @param roomId
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public getRoomMessages(
        roomId: number,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/chat/rooms/{roomId}/messages',
            path: {
                'roomId': roomId,
            },
        });
    }
    /**
     * @deprecated
     * 兼容旧接口：替换房间消息列表
     * 已废弃：请改用 POST /chat/rooms/{roomId}/messages/patch；本接口不再维护 revision/conflict，并返回 changed messages
     * @param roomId
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public replaceRoomMessages(
        roomId: number,
        requestBody: RoomMessageStreamSyncRequest,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/chat/rooms/{roomId}/messages',
            path: {
                'roomId': roomId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @deprecated
     * 兼容旧接口：变更房间消息列表
     * 已废弃：请改用 POST /chat/rooms/{roomId}/messages/patch；本兼容入口返回 changed messages 并走同一套 WebSocket 推送
     * @param roomId
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public patchRoomMessagesAndReturnList(
        roomId: number,
        requestBody: RoomMessageStreamPatchRequest,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'PATCH',
            url: '/chat/rooms/{roomId}/messages',
            path: {
                'roomId': roomId,
            },
            body: requestBody,
            mediaType: 'application/json',
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
     * @deprecated
     * 兼容旧接口：替换房间消息列表快照
     * 已废弃：请改用 POST /chat/rooms/{roomId}/messages/patch；本接口不再维护 revision/conflict，并返回 changed messages
     * @param roomId
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public syncRoomMessagesSnapshot(
        roomId: number,
        requestBody: RoomMessageStreamSyncRequest,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/rooms/{roomId}/messages/snapshot/sync',
            path: {
                'roomId': roomId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @deprecated
     * 兼容旧接口：变更房间消息列表快照
     * 已废弃：请改用 POST /chat/rooms/{roomId}/messages/patch；本兼容入口返回 changed messages
     * @param roomId
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public patchRoomMessagesSnapshot(
        roomId: number,
        requestBody: RoomMessageStreamPatchRequest,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/rooms/{roomId}/messages/snapshot/patch',
            path: {
                'roomId': roomId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 复合批量变更消息
     * 按 insert/update/delete/move 操作一次性变更指定房间消息
     * @param roomId
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public patchRoomMessages(
        roomId: number,
        requestBody: RoomMessageStreamPatchRequest,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/chat/rooms/{roomId}/messages/patch',
            path: {
                'roomId': roomId,
            },
            body: requestBody,
            mediaType: 'application/json',
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
        });
    }
    /**
     * @deprecated
     * 兼容旧接口：获取房间消息列表快照
     * 已废弃：请改用 GET /chat/rooms/{roomId}/messages；本接口返回同一套 room/message 列表，不再返回 revision/conflict
     * @param roomId
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public getRoomMessagesSnapshot(
        roomId: number,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/chat/rooms/{roomId}/messages/snapshot',
            path: {
                'roomId': roomId,
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
        });
    }
}
