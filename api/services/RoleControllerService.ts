/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResult } from '../models/ApiResult';
import type { ApiResultListRoleAvatar } from '../models/ApiResultListRoleAvatar';
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { ApiResultRoleAbilityTable } from '../models/ApiResultRoleAbilityTable';
import type { ApiResultUserRole } from '../models/ApiResultUserRole';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoleAbilityTable } from '../models/RoleAbilityTable';
import type { UserRole } from '../models/UserRole';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param roleId
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public getRole(
        roleId: number,
    ): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role',
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
    /**
     * @param requestBody
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public updateRole(
        requestBody: UserRole,
    ): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/role',
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
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public createRole(): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/role',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * @param roleId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRole(
        roleId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/role',
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
    /**
     * @param roleId
     * @returns ApiResultRoleAbilityTable OK
     * @throws ApiError
     */
    public getRoleAbility(
        roleId: number,
    ): CancelablePromise<ApiResultRoleAbilityTable> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/ability',
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
    /**
     * @param requestBody
     * @returns ApiResult OK
     * @throws ApiError
     */
    public setRoleAbility(
        requestBody: RoleAbilityTable,
    ): CancelablePromise<ApiResult> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/role/ability',
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
     * @param userId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public getUserRoles(
        userId: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/user/{userId}',
            path: {
                'userId': userId,
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
     * @param roleId
     * @returns ApiResultListRoleAvatar OK
     * @throws ApiError
     */
    public getRoleAvatars(
        roleId: number,
    ): CancelablePromise<ApiResultListRoleAvatar> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/avatar',
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
