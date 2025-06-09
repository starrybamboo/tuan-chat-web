/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListRoomMember } from '../models/ApiResultListRoomMember';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoomMemberAddRequest } from '../models/RoomMemberAddRequest';
import type { RoomMemberDeleteRequest } from '../models/RoomMemberDeleteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoomMemberControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 新增房间成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addMember1(
        requestBody: RoomMemberAddRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/room/member/',
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
     * 删除房间成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteMember1(
        requestBody: RoomMemberDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/room/member/',
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
     * 获取房间成员列表
     * @param roomId
     * @returns ApiResultListRoomMember OK
     * @throws ApiError
     */
    public getMemberList1(
        roomId: number,
    ): CancelablePromise<ApiResultListRoomMember> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/room/member/list',
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
    /**
     * 退出房间
     * @param roomId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public exitRoom(
        roomId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/room/member/exit',
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
