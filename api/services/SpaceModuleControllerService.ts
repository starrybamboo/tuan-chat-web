/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListStageEntityResponse } from '../models/ApiResultListStageEntityResponse';
import type { ApiResultModuleMap } from '../models/ApiResultModuleMap';
import type { ModuleImportRequest } from '../models/ModuleImportRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceModuleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 从模组导入群聊
     * @param requestBody
     * @returns ApiResultModuleMap OK
     * @throws ApiError
     */
    public importFromModule(
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
    /**
     * 获取模组整体逻辑图
     * @param spaceId
     * @returns ApiResultModuleMap OK
     * @throws ApiError
     */
    public getMap(
        spaceId: number,
    ): CancelablePromise<ApiResultModuleMap> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/module/map',
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
