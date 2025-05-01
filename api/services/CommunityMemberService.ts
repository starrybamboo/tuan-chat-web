/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListCommunityMemberResponse } from '../models/ApiResultListCommunityMemberResponse';
import type { ApiResultListLong } from '../models/ApiResultListLong';
import type { CommunityMemberRequest } from '../models/CommunityMemberRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CommunityMemberService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Restore member status
     * 恢复社区成员状态
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public restoreMemberStatus(
        requestBody: CommunityMemberRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/member/restore',
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
     * Mute member
     * 禁言社区成员
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public muteMember(
        requestBody: CommunityMemberRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/member/mute',
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
     * List community members
     * 获取社区成员列表
     * @param requestBody
     * @returns ApiResultListCommunityMemberResponse OK
     * @throws ApiError
     */
    public listMembers(
        requestBody: number,
    ): CancelablePromise<ApiResultListCommunityMemberResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/member/list',
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
     * Kick out member
     * 踢出社区成员
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public kickOutMember(
        requestBody: CommunityMemberRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/member/kick',
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
     * Join community
     * 加入社区
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public joinCommunity(
        requestBody: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/member/join',
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
     * Check membership
     * 检查用户是否为社区成员
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public checkMembership(
        requestBody: CommunityMemberRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/community/member/check',
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
     * List user communities
     * 获取用户所属社区ID列表
     * @returns ApiResultListLong OK
     * @throws ApiError
     */
    public listUserCommunities(): CancelablePromise<ApiResultListLong> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/community/member/my-communities',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
