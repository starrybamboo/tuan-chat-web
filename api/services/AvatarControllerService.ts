/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListRoleAvatar } from '../models/ApiResultListRoleAvatar';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultRoleAvatar } from '../models/ApiResultRoleAvatar';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoleAvatar } from '../models/RoleAvatar';
import type { RoleAvatarCreateRequest } from '../models/RoleAvatarCreateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AvatarControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 根据id获取头像
     * @param avatarId
     * @returns ApiResultRoleAvatar OK
     * @throws ApiError
     */
    public getRoleAvatar(
        avatarId: number,
    ): CancelablePromise<ApiResultRoleAvatar> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/avatar',
            query: {
                'avatarId': avatarId,
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
     * 根据头像id更新头像
     * @param requestBody
     * @returns ApiResultRoleAvatar OK
     * @throws ApiError
     */
    public updateRoleAvatar(
        requestBody: RoleAvatar,
    ): CancelablePromise<ApiResultRoleAvatar> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/avatar',
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
     * 创建头像，并返回头像ID
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public setRoleAvatar(
        requestBody: RoleAvatarCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/avatar',
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
     * 根据id删除头像
     * @param avatarId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRoleAvatar(
        avatarId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/avatar',
            query: {
                'avatarId': avatarId,
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
     * 获取角色所有的头像
     * @param roleId
     * @returns ApiResultListRoleAvatar OK
     * @throws ApiError
     */
    public getRoleAvatars(
        roleId: number,
    ): CancelablePromise<ApiResultListRoleAvatar> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/avatar/list',
            query: {
                'roleId': roleId,
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
