/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListRoleResponse } from '../models/ApiResultListRoleResponse';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultPageBaseRespRoleResponse } from '../models/ApiResultPageBaseRespRoleResponse';
import type { ApiResultRoleResponse } from '../models/ApiResultRoleResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoleCreateRequest } from '../models/RoleCreateRequest';
import type { RolePageQueryRequest } from '../models/RolePageQueryRequest';
import type { RoleUpdateRequest } from '../models/RoleUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 根据id获取角色
     * @param roleId
     * @returns ApiResultRoleResponse OK
     * @throws ApiError
     */
    public getRole(
        roleId: number,
    ): CancelablePromise<ApiResultRoleResponse> {
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
     * 更新角色信息
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRole(
        requestBody: RoleUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
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
     * 新增角色，返回角色id
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public createRole(
        requestBody: RoleCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
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
     * 根据id批量删除角色
     * @param roleId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteRole1(
        roleId: Array<number>,
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
     * 分页获取角色,支持姓名模糊查询
     * @param requestBody
     * @returns ApiResultPageBaseRespRoleResponse OK
     * @throws ApiError
     */
    public getRolesByPage(
        requestBody: RolePageQueryRequest,
    ): CancelablePromise<ApiResultPageBaseRespRoleResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/role/page',
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
     * 获取用户的所有角色
     * @param userId
     * @returns ApiResultListRoleResponse OK
     * @throws ApiError
     */
    public getUserRoles(
        userId: number,
    ): CancelablePromise<ApiResultListRoleResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/role/user',
            query: {
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
}
