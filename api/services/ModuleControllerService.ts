/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultPageBaseRespModuleResponse } from '../models/ApiResultPageBaseRespModuleResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ModuleCreateRequest } from '../models/ModuleCreateRequest';
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
     * 新增一个剧本，没有场景和角色
     * 返回对应的id
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public addModule(
        requestBody: ModuleCreateRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
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
     * 获取一个跑团的剧本列表
     * 分页获取一个跑团的剧本列表,可以根据ruleId分页
     * @param requestBody
     * @returns ApiResultPageBaseRespModuleResponse OK
     * @throws ApiError
     */
    public page(
        requestBody: ModulePageRequest,
    ): CancelablePromise<ApiResultPageBaseRespModuleResponse> {
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
}
