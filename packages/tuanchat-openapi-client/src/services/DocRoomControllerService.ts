/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListMessage } from '../models/ApiResultListMessage';
import type { RoomMessageStreamSyncRequest } from '../models/RoomMessageStreamSyncRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DocRoomControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @deprecated
     * 兼容旧接口：批量同步房间消息列表快照
     * 已废弃：请改用 POST /chat/rooms/{roomId}/messages/patch；本接口不再维护 revision/conflict，并返回 changed messages
     * @param roomId
     * @param requestBody
     * @returns ApiResultListMessage OK
     * @throws ApiError
     */
    public syncSnapshot(
        roomId: number,
        requestBody: RoomMessageStreamSyncRequest,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/doc-room/{roomId}/sync',
            path: {
                'roomId': roomId,
            },
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
    public getSnapshot(
        roomId: number,
    ): CancelablePromise<ApiResultListMessage> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/doc-room/{roomId}/snapshot',
            path: {
                'roomId': roomId,
            },
        });
    }
}
