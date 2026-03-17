/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultPageBaseRespRepository } from '../models/ApiResultPageBaseRespRepository';
import type { ApiResultRepository } from '../models/ApiResultRepository';
import type { ApiResultRepositoryCommitChainResponse } from '../models/ApiResultRepositoryCommitChainResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { RepositoryForkPageRequest } from '../models/RepositoryForkPageRequest';
import type { RepositoryPageByUserRequest } from '../models/RepositoryPageByUserRequest';
import type { RepositoryPageRequest } from '../models/RepositoryPageRequest';
import type { RepositoryUpdateRequest } from '../models/RepositoryUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RepositoryControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新仓库
     * 根据请求更新
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateRepository(
        requestBody: RepositoryUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/repository',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 根据用户ID获取仓库列表
     * 获取指定用户创建的仓库列表
     * @param requestBody
     * @returns ApiResultPageBaseRespRepository OK
     * @throws ApiError
     */
    public pageByUserId(
        requestBody: RepositoryPageByUserRequest,
    ): CancelablePromise<ApiResultPageBaseRespRepository> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/repository/user/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取仓库列表
     * 分页获取已发布的根仓库列表
     * @param requestBody
     * @returns ApiResultPageBaseRespRepository OK
     * @throws ApiError
     */
    public page(
        requestBody: RepositoryPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespRepository> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/repository/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取仓库的 fork 列表
     * 分页获取根仓库 + fork 列表（仅发布）
     * @param requestBody
     * @returns ApiResultPageBaseRespRepository OK
     * @throws ApiError
     */
    public pageForks(
        requestBody: RepositoryForkPageRequest,
    ): CancelablePromise<ApiResultPageBaseRespRepository> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/repository/fork/page',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 获取仓库详情
     * 根据id获取仓库详情
     * @param id ID
     * @returns ApiResultRepository OK
     * @throws ApiError
     */
    public getById(
        id: number,
    ): CancelablePromise<ApiResultRepository> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/repository/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * 获取仓库提交链
     * 从仓库当前head commit开始向上追溯父提交链
     * @param id 仓库ID
     * @param limit 最多返回的提交数量，默认120，最大500
     * @returns ApiResultRepositoryCommitChainResponse OK
     * @throws ApiError
     */
    public getCommitChain(
        id: number,
        limit?: number,
    ): CancelablePromise<ApiResultRepositoryCommitChainResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/repository/{id}/commit-chain',
            path: {
                'id': id,
            },
            query: {
                'limit': limit,
            },
        });
    }
}
