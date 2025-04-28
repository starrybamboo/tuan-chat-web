/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListModuleItemResponse } from '../models/ApiResultListModuleItemResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ModuleItemCreateRequest } from '../models/ModuleItemCreateRequest';
import type { ModuleItemDeleteRequest } from '../models/ModuleItemDeleteRequest';
import type { ModuleItemListRequest } from '../models/ModuleItemListRequest';
import type { ModuleItemUpdateRequest } from '../models/ModuleItemUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ModuleItemControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新一个物品
     * 根据请求更新一个物品
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateItem(
        requestBody: ModuleItemUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/module/item',
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
     * 将物品添加到模组中
     * 根据id新增一个物品，返回对应的id
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addItem(
        requestBody: ModuleItemCreateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/item',
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
     * 删除模组中的物品
     * 根据物品id删除物品
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteItem(
        requestBody: ModuleItemDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/module/item',
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
     * 获取模组物品列表
     * 获取模组的物品列表
     * @param requestBody
     * @returns ApiResultListModuleItemResponse OK
     * @throws ApiError
     */
    public list(
        requestBody: ModuleItemListRequest,
    ): CancelablePromise<ApiResultListModuleItemResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/module/item/list',
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
