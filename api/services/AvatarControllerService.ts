/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResult } from '../models/ApiResult';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultRoleAvatar } from '../models/ApiResultRoleAvatar';
import type { RoleAvatarCreateRequest } from '../models/RoleAvatarCreateRequest';
import type { RoleAvatarRequest } from '../models/RoleAvatarRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AvatarControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
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
     * @param requestBody
     * @returns ApiResultRoleAvatar OK
     * @throws ApiError
     */
    public updateRoleAvatar(
        requestBody: RoleAvatarRequest,
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
     * @param avatarId
     * @returns ApiResult OK
     * @throws ApiError
     */
    public deleteRoleAvatar(
        avatarId: number,
    ): CancelablePromise<ApiResult> {
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
}
