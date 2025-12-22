/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListClassificationItemResponse } from '../models/ApiResultListClassificationItemResponse';
import type { ApiResultListClassificationResponse } from '../models/ApiResultListClassificationResponse';
import type { ClassificationByItemRequest } from '../models/ClassificationByItemRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ClassificationControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 根据实体ID和类型获取对应的所有分类
     * @param requestBody
     * @returns ApiResultListClassificationResponse OK
     * @throws ApiError
     */
    public getClassificationsByItemIdAndType(
        requestBody: ClassificationByItemRequest,
    ): CancelablePromise<ApiResultListClassificationResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/classification/by-item',
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
     * 根据分类ID获取所有的分类项
     * @param classificationId
     * @returns ApiResultListClassificationItemResponse OK
     * @throws ApiError
     */
    public getClassificationItems(
        classificationId: number,
    ): CancelablePromise<ApiResultListClassificationItemResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/classification',
            query: {
                'classificationId': classificationId,
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
     * 查询所有特定类型的分类
     * @param type
     * @returns ApiResultListClassificationResponse OK
     * @throws ApiError
     */
    public listClassificationsByType(
        type: string,
    ): CancelablePromise<ApiResultListClassificationResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/classification/list',
            query: {
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
}
