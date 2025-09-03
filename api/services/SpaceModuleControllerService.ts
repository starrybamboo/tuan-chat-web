/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListStageEntityResponse } from '../models/ApiResultListStageEntityResponse';
import type { ApiResultModuleMap } from '../models/ApiResultModuleMap';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ModuleImportByIdRequest } from '../models/ModuleImportByIdRequest';
import type { ModuleImportRequest } from '../models/ModuleImportRequest';
import type { RoomItem } from '../models/RoomItem';
import type { RoomLocation } from '../models/RoomLocation';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceModuleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 通过模组id从模组导入群聊
     * @param requestBody
     * @returns ApiResultModuleMap OK
     * @throws ApiError
     */
    public importFromModule(
        requestBody: ModuleImportByIdRequest,
    ): CancelablePromise<ApiResultModuleMap> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/module/tmpImport',
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
     * 获得当前房间的所有地点
     * @param roomId
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public roomLocation(
        roomId: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/module/room/location',
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
     * 在当前房间（场景）下添加地点
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addLocation(
        requestBody: RoomLocation,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/module/room/location',
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
     * 获得当前房间的所有物品
     * @param roomId
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public roomItem(
        roomId: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/module/room/item',
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
     * 在当前房间（场景）下添加物品
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addItem(
        requestBody: RoomItem,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/module/room/item',
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
     * @returns ApiResultModuleMap OK
     * @throws ApiError
     */
    public importFromModule1(
        requestBody: ModuleImportRequest,
    ): CancelablePromise<ApiResultModuleMap> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/module/import',
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
     * 获取空间的所有角色
     * @param spaceId
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public spaceRole(
        spaceId: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/module/role',
            query: {
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
}
