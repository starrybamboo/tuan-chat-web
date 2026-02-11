/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultRepository } from '../models/ApiResultRepository';
import type { ApiResultPageBaseRespRepository } from '../models/ApiResultPageBaseRespRepository';
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
     * 鏇存柊涓€涓墽鏈?
     * 鏍规嵁璇锋眰鏇存柊
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
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 鏍规嵁鐢ㄦ埛ID鑾峰彇鍓ф湰鍒楄〃
     * 鑾峰彇鎸囧畾鐢ㄦ埛鍒涘缓鐨勫墽鏈垪琛?
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
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
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
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 鑾峰彇涓€涓窇鍥㈢殑鍓ф湰鍒楄〃
     * 鍒嗛〉鑾峰彇涓€涓窇鍥㈢殑鍓ф湰鍒楄〃,鍙互鏍规嵁ruleId鍒嗛〉
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
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 鑾峰彇涓€涓窇鍥㈢殑鍓ф湰璇︽儏
     * 鏍规嵁id鑾峰彇涓€涓窇鍥㈢殑鍓ф湰璇︽儏
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
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}

