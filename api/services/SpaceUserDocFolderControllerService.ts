/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListSpaceUserDocResponse } from '../models/ApiResultListSpaceUserDocResponse';
import type { ApiResultSpaceUserDocFolderTreeResponse } from '../models/ApiResultSpaceUserDocFolderTreeResponse';
import type { ApiResultSpaceUserDocResponse } from '../models/ApiResultSpaceUserDocResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { SpaceUserDocCreateRequest } from '../models/SpaceUserDocCreateRequest';
import type { SpaceUserDocFolderTreeSetRequest } from '../models/SpaceUserDocFolderTreeSetRequest';
import type { SpaceUserDocRenameRequest } from '../models/SpaceUserDocRenameRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceUserDocFolderControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取 Space 用户文档夹树
     * @param spaceId
     * @returns ApiResultSpaceUserDocFolderTreeResponse OK
     * @throws ApiError
     */
    public getTree(
        spaceId: number,
    ): CancelablePromise<ApiResultSpaceUserDocFolderTreeResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/docFolder/tree',
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
     * 设置 Space 用户文档夹树
     * @param requestBody
     * @returns ApiResultSpaceUserDocFolderTreeResponse OK
     * @throws ApiError
     */
    public setTree(
        requestBody: SpaceUserDocFolderTreeSetRequest,
    ): CancelablePromise<ApiResultSpaceUserDocFolderTreeResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/docFolder/tree',
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
     * 获取 Space 用户文档列表
     * @param spaceId
     * @returns ApiResultListSpaceUserDocResponse OK
     * @throws ApiError
     */
    public listDocs(
        spaceId: number,
    ): CancelablePromise<ApiResultListSpaceUserDocResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/docFolder/docs',
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
