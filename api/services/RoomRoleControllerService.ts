/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoomRoleAddRequest } from '../models/RoomRoleAddRequest';
import type { RoomRoleDeleteRequest } from '../models/RoomRoleDeleteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoomRoleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 增加房间的角色
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addRole1(
        requestBody: RoomRoleAddRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/room/role/',
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
     * 删除房间的角色
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRole1(
        requestBody: RoomRoleDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/room/role/',
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
     * 获取房间的所有角色
     * @param roomId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public roomRole1(
        roomId: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/room/role/list',
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
