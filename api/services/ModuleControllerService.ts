/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultModule } from '../models/ApiResultModule';
import type { ApiResultPageBaseRespModule } from '../models/ApiResultPageBaseRespModule';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ModulePageByUserRequest } from '../models/ModulePageByUserRequest';
import type { ModulePageRequest } from '../models/ModulePageRequest';
import type { ModuleUpdateRequest } from '../models/ModuleUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ModuleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新一个剧本
     * 根据请求更新
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateModule(
        requestBody: ModuleUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/module',
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
     * 根据用户ID获取剧本列表
     * 获取指定用户创建的剧本列表
     * @param requestBody
     * @returns ApiResultPageBaseRespModule OK
     * @throws ApiError
     */
    public pageByUserId(
        requestBody: ModulePageByUserRequest,
    ): CancelablePromise<ApiResultPageBaseRespModule> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/user/page',
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
     * 获取一个跑团的剧本列表
     * 分页获取一个跑团的剧本列表,可以根据ruleId分页
     * @param requestBody
     * @returns ApiResultPageBaseRespModule OK
     * @throws ApiError
     */
    public page(
        requestBody: ModulePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespModule> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/page',
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
     * 获取一个跑团的剧本详情
     * 根据id获取一个跑团的剧本详情
     * @param id ID
     * @returns ApiResultModule OK
     * @throws ApiError
     */
    public getById(
        id: number,
    ): CancelablePromise<ApiResultModule> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/module/{id}',
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
