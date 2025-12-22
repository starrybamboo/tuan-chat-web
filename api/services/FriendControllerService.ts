/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultFriendCheckResponse } from '../models/ApiResultFriendCheckResponse';
import type { ApiResultListFriendResponse } from '../models/ApiResultListFriendResponse';
import type { ApiResultPageBaseRespFriendReqResponse } from '../models/ApiResultPageBaseRespFriendReqResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { FriendBlockRequest } from '../models/FriendBlockRequest';
import type { FriendCheckRequest } from '../models/FriendCheckRequest';
import type { FriendDeleteRequest } from '../models/FriendDeleteRequest';
import type { FriendListRequest } from '../models/FriendListRequest';
import type { FriendReqHandleRequest } from '../models/FriendReqHandleRequest';
import type { FriendReqSendRequest } from '../models/FriendReqSendRequest';
import type { PageBaseRequest } from '../models/PageBaseRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FriendControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 取消拉黑
     * 取消拉黑指定好友，恢复正常好友关系
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public unblockFriend(
        requestBody: FriendBlockRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/unblock',
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
     * 发送好友申请
     * 向指定用户发送好友申请
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public sendFriendRequest(
        requestBody: FriendReqSendRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/request/send',
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
     * 拒绝好友申请
     * 拒绝指定的好友申请
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public rejectFriendRequest(
        requestBody: FriendReqHandleRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/request/reject',
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
     * 获取好友申请列表
     * 分页获取当前用户的好友申请列表（包含发送的和接收的）
     * @param requestBody
     * @returns ApiResultPageBaseRespFriendReqResponse OK
     * @throws ApiError
     */
    public getFriendRequestPage(
        requestBody: PageBaseRequest,
    ): CancelablePromise<ApiResultPageBaseRespFriendReqResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/request/page',
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
     * 同意好友申请
     * 同意指定的好友申请
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public acceptFriendRequest(
        requestBody: FriendReqHandleRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/request/accept',
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
     * 获取好友列表
     * 分页获取当前用户的好友列表
     * @param requestBody
     * @returns ApiResultListFriendResponse OK
     * @throws ApiError
     */
    public getFriendList(
        requestBody: FriendListRequest,
    ): CancelablePromise<ApiResultListFriendResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/list',
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
     * 删除好友
     * 删除指定好友，双向解除好友关系
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteFriend(
        requestBody: FriendDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/delete',
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
     * 检查好友关系
     * 检查与指定用户的好友关系状态
     * @param requestBody
     * @returns ApiResultFriendCheckResponse OK
     * @throws ApiError
     */
    public checkFriend(
        requestBody: FriendCheckRequest,
    ): CancelablePromise<ApiResultFriendCheckResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/check',
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
     * 拉黑好友
     * 拉黑指定好友，对方将无法发送消息
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public blockFriend(
        requestBody: FriendBlockRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/block',
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
     * 获取黑名单列表
     * 分页获取当前用户的黑名单列表
     * @param requestBody
     * @returns ApiResultListFriendResponse OK
     * @throws ApiError
     */
    public getBlackList(
        requestBody: FriendListRequest,
    ): CancelablePromise<ApiResultListFriendResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/friend/blacklist',
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
}
