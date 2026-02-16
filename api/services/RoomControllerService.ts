/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultRoom } from '../models/ApiResultRoom';
import type { ApiResultRoomListResponse } from '../models/ApiResultRoomListResponse';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoomArchiveCloneRequest } from '../models/RoomArchiveCloneRequest';
import type { RoomArchiveRequest } from '../models/RoomArchiveRequest';
import type { RoomExtraRequest } from '../models/RoomExtraRequest';
import type { RoomExtraSetRequest } from '../models/RoomExtraSetRequest';
import type { RoomMuteRequest } from '../models/RoomMuteRequest';
import type { RoomUpdateRequest } from '../models/RoomUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoomControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新房间禁言状态
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRoomMuteStatus(
        requestBody: RoomMuteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/room/mute',
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
     * 获取房间其他信息
     * @param roomId
     * @param key
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public getRoomExtra(
        roomId: number,
        key: string,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/room/extra',
            query: {
                'roomId': roomId,
                'key': key,
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
     * 新增或修改房间其他信息
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public setRoomExtra(
        requestBody: RoomExtraSetRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/room/extra',
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
     * 删除房间其他信息
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRoomExtra(
        requestBody: RoomExtraRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/room/extra',
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
            url: '/room/',
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
     * 归档房间(冻结只读)
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public archiveRoom(
        requestBody: RoomArchiveRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/room/archive',
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
     * 从归档房间克隆新房间
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public cloneFromArchivedRoom(
        requestBody: RoomArchiveCloneRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/room/archive/clone',
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
     * @param commitId
     * @returns ApiResultRoom OK
     * @throws ApiError
     */
    public getRoomInfo(
        roomId: number,
        commitId?: number,
    ): CancelablePromise<ApiResultRoom> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/room/{roomId}',
            path: {
                'roomId': roomId,
            },
            query: {
                'commitId': commitId,
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
            url: '/room/{roomId}',
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
     * 获取空间下当前用户加入的所有房间
     * @param spaceId
     * @param commitId
     * @returns ApiResultRoomListResponse OK
     * @throws ApiError
     */
    public getUserRooms(
        spaceId: number,
        commitId?: number,
    ): CancelablePromise<ApiResultRoomListResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/room/list',
            query: {
                'spaceId': spaceId,
                'commitId': commitId,
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
