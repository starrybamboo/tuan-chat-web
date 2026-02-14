/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListSpaceClue } from '../models/ApiResultListSpaceClue';
import type { ApiResultListSpaceClueStars } from '../models/ApiResultListSpaceClueStars';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { ClueStarsCreateRequest } from '../models/ClueStarsCreateRequest';
import type { ClueStarsUpdateRequest } from '../models/ClueStarsUpdateRequest';
import type { SpaceClueCreateRequest } from '../models/SpaceClueCreateRequest';
import type { SpaceClueUpdateRequest } from '../models/SpaceClueUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceClueService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 更新线索
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateClue(
        requestBody: Array<SpaceClueUpdateRequest>,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/clue/update',
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
     * 更新线索文件夹
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public updateClueStars(
        requestBody: ClueStarsUpdateRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/clue/stars/update',
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
     * 批量创建线索文件夹
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public createClueStarsBatch(
        requestBody: Array<ClueStarsCreateRequest>,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/clue/stars/add',
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
     * 批量添加线索
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addClues(
        requestBody: Array<SpaceClueCreateRequest>,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/clue/add',
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
     * 根据空间ID查询当前用户的线索文件夹
     * @param spaceId
     * @param commitId
     * @returns ApiResultListSpaceClueStars OK
     * @throws ApiError
     */
    public getMyClueStarsBySpace(
        spaceId: number,
        commitId?: number,
    ): CancelablePromise<ApiResultListSpaceClueStars> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/clue/stars/list',
            query: {
                'spaceId': spaceId,
                'commitId': commitId,
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
     * 根据线索文件夹ID查询线索列表
     * @param clueStarsId
     * @param commitId
     * @returns ApiResultListSpaceClue OK
     * @throws ApiError
     */
    public getCluesByClueStars(
        clueStarsId: number,
        commitId?: number,
    ): CancelablePromise<ApiResultListSpaceClue> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/clue/list',
            query: {
                'clueStarsId': clueStarsId,
                'commitId': commitId,
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
     * 批量删除线索文件夹
     * @param ids
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteClueStars(
        ids: Array<number>,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/clue/stars/delete',
            query: {
                'ids': ids,
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
     * 批量删除线索
     * @param ids
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteClues(
        ids: Array<number>,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/space/clue/delete',
            query: {
                'ids': ids,
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
