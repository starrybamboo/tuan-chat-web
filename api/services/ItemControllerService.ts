/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultItemResponse } from '../models/ApiResultItemResponse';
import type { ApiResultListItemResponse } from '../models/ApiResultListItemResponse';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultPageBaseRespItemResponse } from '../models/ApiResultPageBaseRespItemResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ItemAddRequest } from '../models/ItemAddRequest';
import type { ItemPageRequest } from '../models/ItemPageRequest';
import type { ItemsGetRequest } from '../models/ItemsGetRequest';
import type { ItemUpdateRequest } from '../models/ItemUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ItemControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取物品详情
     * 根据id获取物品详情
     * @param id 物品ID
     * @returns ApiResultItemResponse OK
     * @throws ApiError
     */
    public getById(
        id: number,
    ): CancelablePromise<ApiResultItemResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/item',
            query: {
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
    /**
     * 更新物品
     * 更新物品信息
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateItem(
        requestBody: ItemUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/item',
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
     * 添加物品
     * 添加物品信息
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public addItem2(
        requestBody: ItemAddRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/item',
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
     * 删除物品
     * 根据ID删除物品
     * @param id 物品ID
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteItem(
        id: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/item',
            query: {
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
    /**
     * 分页获取物品
     * @param requestBody
     * @returns ApiResultPageBaseRespItemResponse OK
     * @throws ApiError
     */
    public page1(
        requestBody: ItemPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespItemResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/item/page',
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
     * 获取多个物品详情
     * @param requestBody
     * @returns ApiResultListItemResponse OK
     * @throws ApiError
     */
    public getByIds(
        requestBody: ItemsGetRequest,
    ): CancelablePromise<ApiResultListItemResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/item/list',
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
