/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListStageEntityResponse } from '../models/ApiResultListStageEntityResponse';
import type { ApiResultListStageResponse } from '../models/ApiResultListStageResponse';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultStageEntityResponse } from '../models/ApiResultStageEntityResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { CommitRequest } from '../models/CommitRequest';
import type { EntityAddRequest } from '../models/EntityAddRequest';
import type { EntityDeleteRequest } from '../models/EntityDeleteRequest';
import type { EntityUpdateRequest } from '../models/EntityUpdateRequest';
import type { RoleImportRequest } from '../models/RoleImportRequest';
import type { StageRollbackRequest } from '../models/StageRollbackRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class StageControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 修改实体
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public update(
        requestBody: EntityUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/update',
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
     * 回退文件信息
     * @param requestBody
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public rollback(
        requestBody: StageRollbackRequest,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/rollback',
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
     * 导入角色
     * @param requestBody
     * @returns ApiResultStageEntityResponse OK
     * @throws ApiError
     */
    public importRole(
        requestBody: RoleImportRequest,
    ): CancelablePromise<ApiResultStageEntityResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/importRole',
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
     * 删除实体
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public delete(
        requestBody: EntityDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/delete',
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
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public commit(
        requestBody: CommitRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/commit',
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
     * 添加实体
     * 同种类型名字不能重复，map只能有一个
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public add(
        requestBody: EntityAddRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/add',
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
     * 打开工作区时自动查询，显示所有自己拥有暂存区的模组（正在修改）
     * @returns ApiResultListStageResponse OK
     * @throws ApiError
     */
    public staging(): CancelablePromise<ApiResultListStageResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/stage',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 根据id查看实体最新状态
     * @param id
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public get(
        id: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/stage/query',
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
     * @param name
     * @param stageId
     * @returns ApiResultStageEntityResponse OK
     * @throws ApiError
     */
    public getByName(
        name: string,
        stageId: number,
    ): CancelablePromise<ApiResultStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/stage/name',
            query: {
                'name': name,
                'stageId': stageId,
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
     * 查看最新详情
     * @param stageId
     * @param type
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public queryEntities(
        stageId: number,
        type?: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/stage/info',
            query: {
                'stageId': stageId,
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
    /**
     * 查看对于commit的修改
     * @param stageId
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public change(
        stageId: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/stage/change',
            query: {
                'stageId': stageId,
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
