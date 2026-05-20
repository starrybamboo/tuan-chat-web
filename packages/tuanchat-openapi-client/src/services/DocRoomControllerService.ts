/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultRoomMessageStreamResponse } from '../models/ApiResultRoomMessageStreamResponse';
import type { RoomMessageStreamSyncRequest } from '../models/RoomMessageStreamSyncRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DocRoomControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 兼容旧接口：批量同步 room message-stream
     * @param roomId
     * @param requestBody
     * @returns ApiResultRoomMessageStreamResponse OK
     * @throws ApiError
     */
    public syncSnapshot(
        roomId: number,
        requestBody: RoomMessageStreamSyncRequest,
    ): CancelablePromise<ApiResultRoomMessageStreamResponse> {
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
     * 兼容旧接口：获取 room message-stream
     * @param roomId
     * @returns ApiResultRoomMessageStreamResponse OK
     * @throws ApiError
     */
    public getSnapshot(
        roomId: number,
    ): CancelablePromise<ApiResultRoomMessageStreamResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/doc-room/{roomId}/snapshot',
            path: {
                'roomId': roomId,
            },
        });
    }
}
