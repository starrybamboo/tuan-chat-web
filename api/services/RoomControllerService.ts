/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListRoom } from '../models/ApiResultListRoom';
import type { ApiResultRoom } from '../models/ApiResultRoom';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { FightRoomAddRequest } from '../models/FightRoomAddRequest';
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
            url: '/capi/room/mute',
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
     * @param request
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public getRoomExtra(
        request: RoomExtraRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/room/extra',
            query: {
                'request': request,
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
            url: '/capi/room/extra',
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
            url: '/capi/room/extra',
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
     * 创建战斗轮房间
     * @param requestBody
     * @returns ApiResultRoom OK
     * @throws ApiError
     */
    public createRoom1(
        requestBody: FightRoomAddRequest,
    ): CancelablePromise<ApiResultRoom> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/room/fight',
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
     * 获取空间下当前用户加入的所有房间
     * @param spaceId
     * @returns ApiResultListRoom OK
     * @throws ApiError
     */
    public getUserRooms(
        spaceId: number,
    ): CancelablePromise<ApiResultListRoom> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/room/list',
            query: {
                'spaceId': spaceId,
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
