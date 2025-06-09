/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultModuleScene } from '../models/ApiResultModuleScene';
import type { ApiResultPageBaseRespModuleScene } from '../models/ApiResultPageBaseRespModuleScene';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ModuleSceneCreateRequest } from '../models/ModuleSceneCreateRequest';
import type { ModuleSceneDeleteRequest } from '../models/ModuleSceneDeleteRequest';
import type { ModuleScenePageRequest } from '../models/ModuleScenePageRequest';
import type { ModuleSceneUpdateRequest } from '../models/ModuleSceneUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ModuleSceneService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新一个场景
     * 根据请求更新一个场景
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateScene(
        requestBody: ModuleSceneUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/module/scene',
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
     * 新增一个场景
     * 根据id新增一个场景，返回对应的id
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public addScene(
        requestBody: ModuleSceneCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/scene',
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
     * 删除场景
     * 根据id删除场景
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteScene(
        requestBody: ModuleSceneDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/module/scene',
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
     * 获取模组的场景列表
     * 获取模组的场景列表
     * @param requestBody
     * @returns ApiResultPageBaseRespModuleScene OK
     * @throws ApiError
     */
    public page(
        requestBody: ModuleScenePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespModuleScene> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/scene/page',
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
     * 获取模组的场景详情
     * 根据id获取模组的场景详情
     * @param id 一个场景的ID
     * @returns ApiResultModuleScene OK
     * @throws ApiError
     */
    public getSceneById(
        id: number,
    ): CancelablePromise<ApiResultModuleScene> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/module/scene/{id}',
            path: {
                'id': id,
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
