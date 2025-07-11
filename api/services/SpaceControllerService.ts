/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListSpace } from '../models/ApiResultListSpace';
import type { ApiResultRoom } from '../models/ApiResultRoom';
import type { ApiResultSpace } from '../models/ApiResultSpace';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ImportFromModuleRequest } from '../models/ImportFromModuleRequest';
import type { RoomAddRequest } from '../models/RoomAddRequest';
import type { SpaceAddRequest } from '../models/SpaceAddRequest';
import type { SpaceArchiveRequest } from '../models/SpaceArchiveRequest';
import type { SpaceOwnerTransferRequest } from '../models/SpaceOwnerTransferRequest';
import type { SpaceUpdateRequest } from '../models/SpaceUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 转让空间
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public transferSpaceOwner(
        requestBody: SpaceOwnerTransferRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/space/transfer',
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
     * 更新空间归档状态
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateSpaceArchiveStatus(
        requestBody: SpaceArchiveRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/space/archive',
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
     * 更新空间信息(名称、头像、描述、规则)
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateSpace(
        requestBody: SpaceUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/space/',
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
     * 创建空间
     * @param requestBody
     * @returns ApiResultSpace OK
     * @throws ApiError
     */
    public createSpace(
        requestBody: SpaceAddRequest,
    ): CancelablePromise<ApiResultSpace> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/',
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
     * 创建子群聊房间
     * @param requestBody
     * @returns ApiResultRoom OK
     * @throws ApiError
     */
    public createRoom(
        requestBody: RoomAddRequest,
    ): CancelablePromise<ApiResultRoom> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/room',
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
     * 从模组导入群聊
     * @param requestBody
     * @returns ApiResultSpace OK
     * @throws ApiError
     */
    public importFromModule(
        requestBody: ImportFromModuleRequest,
    ): CancelablePromise<ApiResultSpace> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/import',
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
     * 获取空间
     * @param spaceId
     * @returns ApiResultSpace OK
     * @throws ApiError
     */
    public getSpaceInfo(
        spaceId: number,
    ): CancelablePromise<ApiResultSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/{spaceId}',
            path: {
                'spaceId': spaceId,
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
     * 解散空间
     * @param spaceId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public dissolveSpace(
        spaceId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/space/{spaceId}',
            path: {
                'spaceId': spaceId,
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
     * 获取当前用户加入的所有空间
     * @returns ApiResultListSpace OK
     * @throws ApiError
     */
    public getUserSpaces(): CancelablePromise<ApiResultListSpace> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
