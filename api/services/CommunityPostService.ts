/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCursorPageBaseResponsePostListWithStatsResponse } from '../models/ApiResultCursorPageBaseResponsePostListWithStatsResponse';
import type { ApiResultPostWithStatsResponse } from '../models/ApiResultPostWithStatsResponse';
import type { PagePostRequest } from '../models/PagePostRequest';
import type { PostCreateRequest } from '../models/PostCreateRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CommunityPostService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Publish post
     * 发布帖子
     * @param requestBody
     * @returns ApiResultPostWithStatsResponse OK
     * @throws ApiError
     */
    public publishPost(
        requestBody: PostCreateRequest,
    ): CancelablePromise<ApiResultPostWithStatsResponse> {
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
     * List user posts
     * 获取用户发布的帖子
     * @param requestBody
     * @returns ApiResultCursorPageBaseResponsePostListWithStatsResponse OK
     * @throws ApiError
     */
    public pageUserPosts(
        requestBody: PagePostRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponsePostListWithStatsResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/post/posts',
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
     * @returns ApiResultCursorPageBaseResponsePostListWithStatsResponse OK
     * @throws ApiError
     */
    public pageCommunityPosts(
        requestBody: PagePostRequest,
    ): CancelablePromise<ApiResultCursorPageBaseResponsePostListWithStatsResponse> {
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
     * Get post detail
     * 获取帖子详情
     * @param postId
     * @returns ApiResultPostWithStatsResponse OK
     * @throws ApiError
     */
    public getPostDetail(
        postId: number,
    ): CancelablePromise<ApiResultPostWithStatsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/community/post/detail',
            query: {
                'postId': postId,
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
     * Delete post
     * 删除帖子
     * @param postId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deletePost(
        postId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/community/post/delete',
            query: {
                'postId': postId,
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
