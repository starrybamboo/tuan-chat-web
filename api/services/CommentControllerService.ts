/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultCommentVO } from '../models/ApiResultCommentVO';
import type { ApiResultInteger } from '../models/ApiResultInteger';
import type { ApiResultListCommentVO } from '../models/ApiResultListCommentVO';
import type { ApiResultLong } from '../models/ApiResultLong';
import type { ApiResultMapLongInteger } from '../models/ApiResultMapLongInteger';
import type { CommentAddRequest } from '../models/CommentAddRequest';
import type { CommentCountRequest } from '../models/CommentCountRequest';
import type { CommentPageRequest } from '../models/CommentPageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CommentControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取评论
     * 根据评论ID获取评论详情
     * @param commentId
     * @returns ApiResultCommentVO OK
     * @throws ApiError
     */
    public getComment(
        commentId: number,
    ): CancelablePromise<ApiResultCommentVO> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/comment',
            query: {
                'commentId': commentId,
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
     * 发布评论
     * 发布新评论或回复评论
     * @param requestBody
     * @returns ApiResultLong OK
     * @throws ApiError
     */
    public addComment(
        requestBody: CommentAddRequest,
    ): CancelablePromise<ApiResultLong> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/comment',
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
     * 删除评论
     * 软删除评论
     * @param commentId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deleteComment(
        commentId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/comment',
            query: {
                'commentId': commentId,
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
     * 分页获取评论
     * 获取目标对象的树状评论
     * @param requestBody
     * @returns ApiResultListCommentVO OK
     * @throws ApiError
     */
    public pageComments(
        requestBody: CommentPageRequest,
    ): CancelablePromise<ApiResultListCommentVO> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/comment/page',
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
     * 批量获取评论数量
     * @param requestBody
     * @returns ApiResultMapLongInteger OK
     * @throws ApiError
     */
    public batchGetCommentCount(
        requestBody: CommentCountRequest,
    ): CancelablePromise<ApiResultMapLongInteger> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/comment/count/batch',
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
     * 获取评论数量
     * @param targetId
     * @param targetType
     * @returns ApiResultInteger OK
     * @throws ApiError
     */
    public getCommentCount(
        targetId: number,
        targetType: number,
    ): CancelablePromise<ApiResultInteger> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/comment/count',
            query: {
                'targetId': targetId,
                'targetType': targetType,
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
