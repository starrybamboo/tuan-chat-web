/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListSpaceUserDocResponse } from '../models/ApiResultListSpaceUserDocResponse';
import type { ApiResultSpaceUserDocResponse } from '../models/ApiResultSpaceUserDocResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { SpaceUserDocCreateRequest } from '../models/SpaceUserDocCreateRequest';
import type { SpaceUserDocRenameRequest } from '../models/SpaceUserDocRenameRequest';
import type { SpaceUserDocTagUpdateRequest } from '../models/SpaceUserDocTagUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceUserDocControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 重命名 Space 用户文档
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public renameDoc(
        requestBody: SpaceUserDocRenameRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/docFolder/doc/title',
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
     * 重命名 Space 用户文档
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public renameDoc1(
        requestBody: SpaceUserDocRenameRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/userDoc/doc/title',
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
     * 更新 Space 用户文档标签
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateDocTag(
        requestBody: SpaceUserDocTagUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/docFolder/doc/tag',
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
     * 更新 Space 用户文档标签
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateDocTag1(
        requestBody: SpaceUserDocTagUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/userDoc/doc/tag',
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
     * 创建 Space 用户文档
     * @param requestBody
     * @returns ApiResultSpaceUserDocResponse OK
     * @throws ApiError
     */
    public createDoc1(
        requestBody: SpaceUserDocCreateRequest,
    ): CancelablePromise<ApiResultSpaceUserDocResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/docFolder/doc',
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
     * 删除 Space 用户文档（软删除）
     * @param docId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteDoc1(
        docId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/docFolder/doc',
            query: {
                'docId': docId,
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
     * 创建 Space 用户文档
     * @param requestBody
     * @returns ApiResultSpaceUserDocResponse OK
     * @throws ApiError
     */
    public createDoc2(
        requestBody: SpaceUserDocCreateRequest,
    ): CancelablePromise<ApiResultSpaceUserDocResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/userDoc/doc',
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
     * 删除 Space 用户文档（软删除）
     * @param docId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteDoc2(
        docId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/userDoc/doc',
            query: {
                'docId': docId,
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
     * 获取 Space 用户文档列表（支持按 tag 过滤）
     * @param spaceId
     * @param tag
     * @returns ApiResultListSpaceUserDocResponse OK
     * @throws ApiError
     */
    public listDocs(
        spaceId: number,
        tag?: string,
    ): CancelablePromise<ApiResultListSpaceUserDocResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/docFolder/docs',
            query: {
                'spaceId': spaceId,
                'tag': tag,
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
     * 获取 Space 用户文档列表（支持按 tag 过滤）
     * @param spaceId
     * @param tag
     * @returns ApiResultListSpaceUserDocResponse OK
     * @throws ApiError
     */
    public listDocs1(
        spaceId: number,
        tag?: string,
    ): CancelablePromise<ApiResultListSpaceUserDocResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/userDoc/docs',
            query: {
                'spaceId': spaceId,
                'tag': tag,
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
