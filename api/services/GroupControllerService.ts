/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultGroup } from '../models/ApiResultGroup';
import type { ApiResultListGroup } from '../models/ApiResultListGroup';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { GroupAddRequest } from '../models/GroupAddRequest';
import type { GroupArchiveRequest } from '../models/GroupArchiveRequest';
import type { GroupAvatarUpdateRequest } from '../models/GroupAvatarUpdateRequest';
import type { GroupDescriptionUpdateRequest } from '../models/GroupDescriptionUpdateRequest';
import type { GroupDissolveRequest } from '../models/GroupDissolveRequest';
import type { GroupNameUpdateRequest } from '../models/GroupNameUpdateRequest';
import type { SubRoomRequest } from '../models/SubRoomRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GroupControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新群名称
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateGroupName(
        requestBody: GroupNameUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/group/name',
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
     * 更新群描述
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateGroupDescription(
        requestBody: GroupDescriptionUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/group/description',
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
     * 更新群头像
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateGroupAvatar(
        requestBody: GroupAvatarUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/group/avatar',
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
     * 更新群组归档状态
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateGroupArchiveStatus(
        requestBody: GroupArchiveRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/group/archive',
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
     * 创建子群
     * @param requestBody
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public createSubgroup(
        requestBody: SubRoomRequest,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/subgroup',
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
     * 创建群组
     * @param requestBody
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public createGroup(
        requestBody: GroupAddRequest,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/',
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
     * 获取群组信息
     * @param groupId
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public getGroupInfo(
        groupId: number,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/{groupId}',
            path: {
                'groupId': groupId,
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
     * 获取当前用户加入的所有群聊
     * @returns ApiResultListGroup OK
     * @throws ApiError
     */
    public getUserGroups(): CancelablePromise<ApiResultListGroup> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 解散群组
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public dissolveGroup(
        requestBody: GroupDissolveRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/group/dissolve',
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
