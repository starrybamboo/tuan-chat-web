/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListStageEntityResponse } from '../models/ApiResultListStageEntityResponse';
import type { ApiResultListStageResponse } from '../models/ApiResultListStageResponse';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultModuleInfo } from '../models/ApiResultModuleInfo';
import type { ApiResultStageEntityResponse } from '../models/ApiResultStageEntityResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { CommitRequest } from '../models/CommitRequest';
import type { EntityAddRequest } from '../models/EntityAddRequest';
import type { EntityRenameRequest } from '../models/EntityRenameRequest';
import type { RoleImportRequest } from '../models/RoleImportRequest';
import type { StageRollbackRequest } from '../models/StageRollbackRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class StageControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 回退文件信息
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public rollback(
        requestBody: StageRollbackRequest,
    ): CancelablePromise<ApiResultVoid> {
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
     * 修改实体name，效果等同于删除原实体，再添加一个只有name不同的实体
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public rename(
        requestBody: EntityRenameRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/rename',
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
     * 将角色导入暂存区
     * @param requestBody
     * @returns ApiResultStageEntityResponse OK
     * @throws ApiError
     */
    public importRole(
        requestBody: RoleImportRequest,
    ): CancelablePromise<ApiResultStageEntityResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/stage/import/role',
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
     * 添加实体到暂存区，或修改删除暂存区里已有的实体
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
     * 根据stageId查询当前模组当前用户分支的最新commit详情
     * @param moduleId
     * @returns ApiResultModuleInfo OK
     * @throws ApiError
     */
    public queryCommit(
        moduleId: number,
    ): CancelablePromise<ApiResultModuleInfo> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/stage/info',
            query: {
                'moduleId': moduleId,
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
     * 根据暂存区id查询所有暂存实体
     * @param moduleId
     * @returns ApiResultListStageEntityResponse OK
     * @throws ApiError
     */
    public queryEntities(
        moduleId: number,
    ): CancelablePromise<ApiResultListStageEntityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/stage/change',
            query: {
                'moduleId': moduleId,
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
