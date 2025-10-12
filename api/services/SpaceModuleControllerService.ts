/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListStageEntityResponse } from '../models/ApiResultListStageEntityResponse';
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { ApiResultModuleMap } from '../models/ApiResultModuleMap';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ModuleExportRequest } from '../models/ModuleExportRequest';
import type { ModuleImportByIdRequest } from '../models/ModuleImportByIdRequest';
import type { ModuleImportRequest } from '../models/ModuleImportRequest';
import type { RoomClue } from '../models/RoomClue';
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
     * 获得当前房间的所有物品
     * @param roomId
     * @param type
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public roomItem(
        roomId: number,
        type: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/module/room/clue',
            query: {
                'roomId': roomId,
                'type': type,
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
     * 在当前房间（场景）下添加原始线索
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addCLue(
        requestBody: Array<RoomClue>,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/module/room/clue',
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
     * 导出到暂存区
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public export(
        requestBody: ModuleExportRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/module/export',
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
     * 获取空间的所有NPC，仅kp调用
     * @param spaceId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public spaceRole(
        spaceId: number,
    ): CancelablePromise<ApiResultListUserRole> {
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
