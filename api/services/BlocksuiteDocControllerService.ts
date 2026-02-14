/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBlocksuiteDocUpdatePushResponse } from '../models/ApiResultBlocksuiteDocUpdatePushResponse';
import type { ApiResultBlocksuiteDocUpdatesResponse } from '../models/ApiResultBlocksuiteDocUpdatesResponse';
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { BlocksuiteDocCompactRequest } from '../models/BlocksuiteDocCompactRequest';
import type { BlocksuiteDocUpdatePushRequest } from '../models/BlocksuiteDocUpdatePushRequest';
import type { BlocksuiteDocUpsertRequest } from '../models/BlocksuiteDocUpsertRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class BlocksuiteDocControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取Blocksuite文档快照
     * @param entityType
     * @param entityId
     * @param docType
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public getDoc(
        entityType: string,
        entityId: number,
        docType: string,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/blocksuite/doc',
            query: {
                'entityType': entityType,
                'entityId': entityId,
                'docType': docType,
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
     * 新增或修改Blocksuite文档快照
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public upsertDoc(
        requestBody: BlocksuiteDocUpsertRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/blocksuite/doc',
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
     * 删除Blocksuite文档快照（硬删除）
     * @param entityType
     * @param entityId
     * @param docType
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteDoc2(
        entityType: string,
        entityId: number,
        docType: string,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/blocksuite/doc',
            query: {
                'entityType': entityType,
                'entityId': entityId,
                'docType': docType,
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
     * 写入Blocksuite文档增量更新（yjs update）
     * @param requestBody
     * @returns ApiResultBlocksuiteDocUpdatePushResponse OK
     * @throws ApiError
     */
    public pushDocUpdate(
        requestBody: BlocksuiteDocUpdatePushRequest,
    ): CancelablePromise<ApiResultBlocksuiteDocUpdatePushResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/blocksuite/doc/update',
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
     * 压缩Blocksuite文档增量更新（删除<=beforeOrEqServerTime的updates，配合快照合并使用）
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public compactDocUpdates(
        requestBody: BlocksuiteDocCompactRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/blocksuite/doc/compact',
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
     * 拉取Blocksuite文档增量更新（按serverTime游标）
     * @param entityType
     * @param entityId
     * @param docType
     * @param afterServerTime
     * @param limit
     * @returns ApiResultBlocksuiteDocUpdatesResponse OK
     * @throws ApiError
     */
    public listDocUpdates(
        entityType: string,
        entityId: number,
        docType: string,
        afterServerTime?: number,
        limit?: number,
    ): CancelablePromise<ApiResultBlocksuiteDocUpdatesResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/blocksuite/doc/updates',
            query: {
                'entityType': entityType,
                'entityId': entityId,
                'docType': docType,
                'afterServerTime': afterServerTime,
                'limit': limit,
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
