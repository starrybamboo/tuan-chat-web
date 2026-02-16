/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListSpaceDocResponse } from '../models/ApiResultListSpaceDocResponse';
import type { ApiResultSpaceDocResponse } from '../models/ApiResultSpaceDocResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { SpaceDocCreateRequest } from '../models/SpaceDocCreateRequest';
import type { SpaceDocRenameRequest } from '../models/SpaceDocRenameRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceDocControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 重命名 Space 共享文档
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public renameDoc2(
        requestBody: SpaceDocRenameRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/doc/title',
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
     * 创建 Space 共享文档
     * @param requestBody
     * @returns ApiResultSpaceDocResponse OK
     * @throws ApiError
     */
    public createDoc(
        requestBody: SpaceDocCreateRequest,
    ): CancelablePromise<ApiResultSpaceDocResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/doc',
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
     * 删除 Space 共享文档（软删除）
     * @param docId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteDoc(
        docId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/doc',
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
     * 获取 Space 共享文档列表
     * @param spaceId
     * @returns ApiResultListSpaceDocResponse OK
     * @throws ApiError
     */
    public listDocs2(
        spaceId: number,
    ): CancelablePromise<ApiResultListSpaceDocResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/doc/list',
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
