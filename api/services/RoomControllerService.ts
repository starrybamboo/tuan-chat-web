/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListRoom } from '../models/ApiResultListRoom';
import type { ApiResultRoom } from '../models/ApiResultRoom';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoomUpdateRequest } from '../models/RoomUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoomControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新房间信息(名称、头像、描述)
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRoom(
        requestBody: RoomUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/room/',
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
     * 获取房间
     * @param roomId
     * @returns ApiResultRoom OK
     * @throws ApiError
     */
    public getRoomInfo(
        roomId: number,
    ): CancelablePromise<ApiResultRoom> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/room/{roomId}',
            path: {
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
     * 解散房间
     * @param roomId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public dissolveRoom(
        roomId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/room/{roomId}',
            path: {
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
     * 获取当前用户加入的所有房间
     * @returns ApiResultListRoom OK
     * @throws ApiError
     */
    public getUserRooms(): CancelablePromise<ApiResultListRoom> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/room/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
