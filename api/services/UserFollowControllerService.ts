/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultPageBaseRespUserFollowResponse } from '../models/ApiResultPageBaseRespUserFollowResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { PageBaseRequest } from '../models/PageBaseRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserFollowControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取某人关注列表
     * 获取某人关注列表接口
     * @param targetUserId
     * @param requestBody
     * @returns ApiResultPageBaseRespUserFollowResponse OK
     * @throws ApiError
     */
    public followings(
        targetUserId: number,
        requestBody: PageBaseRequest,
    ): CancelablePromise<ApiResultPageBaseRespUserFollowResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/{targetUserId}/followings/page',
            path: {
                'targetUserId': targetUserId,
            },
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
     * 获取某人粉丝列表
     * 获取某人粉丝列表接口
     * @param targetUserId
     * @param requestBody
     * @returns ApiResultPageBaseRespUserFollowResponse OK
     * @throws ApiError
     */
    public followers(
        targetUserId: number,
        requestBody: PageBaseRequest,
    ): CancelablePromise<ApiResultPageBaseRespUserFollowResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/{targetUserId}/followers/page',
            path: {
                'targetUserId': targetUserId,
            },
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
     * 判断是否关注某用户
     * 判断是否关注某用户接口
     * @param targetUserId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public isFollow(
        targetUserId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/user/{targetUserId}/follow',
            path: {
                'targetUserId': targetUserId,
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
     * 用户关注
     * 用户关注接口
     * @param targetUserId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public follow(
        targetUserId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/{targetUserId}/follow',
            path: {
                'targetUserId': targetUserId,
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
     * 用户取消关注
     * 用户取消关注接口
     * @param targetUserId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public unfollow(
        targetUserId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/user/{targetUserId}/follow',
            path: {
                'targetUserId': targetUserId,
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
