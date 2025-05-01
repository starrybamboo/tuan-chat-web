/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListPostResponse } from '../models/ApiResultListPostResponse';
import type { ApiResultPageBaseRespPostResponse } from '../models/ApiResultPageBaseRespPostResponse';
import type { ApiResultPostResponse } from '../models/ApiResultPostResponse';
import type { PagePostRequest } from '../models/PagePostRequest';
import type { PostCreateRequest } from '../models/PostCreateRequest';
import type { PostUpdateRequest } from '../models/PostUpdateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CommunityPostService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Update post
     * 更新帖子
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public updatePost(
        requestBody: PostUpdateRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/post/update',
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
     * Publish post
     * 发布帖子
     * @param requestBody
     * @returns ApiResultPostResponse OK
     * @throws ApiError
     */
    public publishPost(
        requestBody: PostCreateRequest,
    ): CancelablePromise<ApiResultPostResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/post/publish',
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
     * Page community posts
     * 分页获取社区帖子
     * @param requestBody
     * @returns ApiResultPageBaseRespPostResponse OK
     * @throws ApiError
     */
    public pageCommunityPosts(
        requestBody: PagePostRequest,
    ): CancelablePromise<ApiResultPageBaseRespPostResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/post/page',
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
     * List community posts
     * 获取社区帖子列表
     * @param requestBody
     * @returns ApiResultListPostResponse OK
     * @throws ApiError
     */
    public listCommunityPosts(
        requestBody: number,
    ): CancelablePromise<ApiResultListPostResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/post/list',
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
     * Get post detail
     * 获取帖子详情
     * @param requestBody
     * @returns ApiResultPostResponse OK
     * @throws ApiError
     */
    public getPostDetail(
        requestBody: number,
    ): CancelablePromise<ApiResultPostResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/post/detail',
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
     * Delete post
     * 删除帖子
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deletePost(
        requestBody: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/post/delete',
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
     * List user posts
     * 获取用户发布的帖子
     * @returns ApiResultListPostResponse OK
     * @throws ApiError
     */
    public listUserPosts(): CancelablePromise<ApiResultListPostResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/community/post/my-posts',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
