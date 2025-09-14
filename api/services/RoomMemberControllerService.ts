/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListRoomMember } from '../models/ApiResultListRoomMember';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoomMemberAddRequest } from '../models/RoomMemberAddRequest';
import type { RoomMemberDeleteRequest } from '../models/RoomMemberDeleteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoomMemberControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 通过邀请链接加入房间
     * @param code
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public invited(
        code: string,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/room/member/invited/{code}',
            path: {
                'code': code,
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
     * 生成邀请码，过期时间以天为单位，为空则不过期
     * @param roomId
     * @param duration
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public inviteCode(
        roomId: number,
        duration?: number,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/room/member/inviteCode',
            query: {
                'roomId': roomId,
                'duration': duration,
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
