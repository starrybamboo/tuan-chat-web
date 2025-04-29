/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultModuleRoleInfoResponse } from '../models/ApiResultModuleRoleInfoResponse';
import type { ApiResultPageBaseRespModuleRoleInfoResponse } from '../models/ApiResultPageBaseRespModuleRoleInfoResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ModuleRoleCreateRequest } from '../models/ModuleRoleCreateRequest';
import type { ModuleRoleDeleteRequest } from '../models/ModuleRoleDeleteRequest';
import type { ModuleRolePageRequest } from '../models/ModuleRolePageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ModuleRoleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取预设卡id详情
     * 根据id获取预设卡id详情
     * @param moduleId
     * @param roleId
     * @returns ApiResultModuleRoleInfoResponse OK
     * @throws ApiError
     */
    public getModuleRoleInfo(
        moduleId: number,
        roleId: number,
    ): CancelablePromise<ApiResultModuleRoleInfoResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/module/role',
            query: {
                'moduleId': moduleId,
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
     * 创建模组角色
     * 创建模组角色
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public createModuleRole(
        requestBody: ModuleRoleCreateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/role',
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
     * 删除模组角色
     * 根据模组id和角色id删除模组角色
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteModuleRole(
        requestBody: ModuleRoleDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/module/role',
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
     * @returns ApiResultPageBaseRespModuleRoleInfoResponse OK
     * @throws ApiError
     */
    public getModuleRolePage(
        requestBody: ModuleRolePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespModuleRoleInfoResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/role/page',
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
}
