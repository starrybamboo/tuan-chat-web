/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultPageBaseRespUserRole } from '../models/ApiResultPageBaseRespUserRole';
import type { ApiResultUserRole } from '../models/ApiResultUserRole';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RoleCopyRequest } from '../models/RoleCopyRequest';
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
     * @param commitId
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public getRole(
        roleId: number,
        commitId?: number,
    ): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/role',
            query: {
                'roleId': roleId,
                'commitId': commitId,
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
            url: '/role',
            body: requestBody,
            mediaType: 'application/json',
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
            url: '/role',
            body: requestBody,
            mediaType: 'application/json',
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
            url: '/role',
            query: {
                'roleId': roleId,
            },
        });
    }
    /**
     * 分页获取个人角色回收站,支持姓名模糊查询
     * @param requestBody
     * @returns ApiResultPageBaseRespUserRole OK
     * @throws ApiError
     */
    public getDeletedRolesByPage(
        requestBody: RolePageQueryRequest,
    ): CancelablePromise<ApiResultPageBaseRespUserRole> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/role/trash/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 分页获取空间 NPC 回收站,支持姓名模糊查询
     * @param spaceId
     * @param requestBody
     * @returns ApiResultPageBaseRespUserRole OK
     * @throws ApiError
     */
    public getDeletedNpcRolesByPage(
        spaceId: number,
        requestBody: RolePageQueryRequest,
    ): CancelablePromise<ApiResultPageBaseRespUserRole> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/role/trash/npc/page',
            query: {
                'spaceId': spaceId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 分页获取角色,支持姓名模糊查询
     * @param requestBody
     * @returns ApiResultPageBaseRespUserRole OK
     * @throws ApiError
     */
    public getRolesByPage(
        requestBody: RolePageQueryRequest,
    ): CancelablePromise<ApiResultPageBaseRespUserRole> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/role/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 复制角色（当前仅支持复制为骰娘）
     * @param requestBody
     * @returns ApiResultUserRole OK
     * @throws ApiError
     */
    public copyRole(
        requestBody: RoleCopyRequest,
    ): CancelablePromise<ApiResultUserRole> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/role/copy',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取用户的所有角色
     * @param userId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public getUserRoles(
        userId: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/role/user',
            query: {
                'userId': userId,
            },
        });
    }
    /**
     * 按类型获取用户角色
     * @param userId
     * @param type
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public getUserRolesByType(
        userId: number,
        type?: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/role/user/type',
            query: {
                'userId': userId,
                'type': type,
            },
        });
    }
    /**
     * 清空空间 NPC 回收站
     * @param spaceId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public clearNpcRoleTrash(
        spaceId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/role/trash/npc/clear',
            query: {
                'spaceId': spaceId,
            },
        });
    }
    /**
     * 清空角色回收站
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public clearRoleTrash(): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/role/trash/clear',
        });
    }
    /**
     * 根据id批量硬删除角色
     * @param roleId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public hardDeleteRole(
        roleId: Array<number>,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/role/hard',
            query: {
                'roleId': roleId,
            },
        });
    }
}
