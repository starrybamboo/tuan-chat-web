/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListSpaceMember } from '../models/ApiResultListSpaceMember';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { LeaderTransferRequest } from '../models/LeaderTransferRequest';
import type { PlayerGrantRequest } from '../models/PlayerGrantRequest';
import type { PlayerRevokeRequest } from '../models/PlayerRevokeRequest';
import type { SpaceMemberAddRequest } from '../models/SpaceMemberAddRequest';
import type { SpaceMemberDeleteRequest } from '../models/SpaceMemberDeleteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceMemberControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 设置用户为玩家
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public grantPlayer(
        requestBody: PlayerGrantRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/space/member/player',
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
     * 撤销用户玩家的身份
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public revokePlayer(
        requestBody: PlayerRevokeRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/space/member/player',
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
     * 把裁判转让给其他成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public transferLeader(
        requestBody: LeaderTransferRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/space/member/leader',
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
     * 新增空间成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addMember(
        requestBody: SpaceMemberAddRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/space/member/',
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
     * 删除空间成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteMember(
        requestBody: SpaceMemberDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/space/member/',
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
     * 获取空间成员列表
     * @param spaceId
     * @returns ApiResultListSpaceMember OK
     * @throws ApiError
     */
    public getMemberList(
        spaceId: number,
    ): CancelablePromise<ApiResultListSpaceMember> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/member/list',
            query: {
                'spaceId': spaceId,
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
     * 退出空间
     * @param spaceId
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public exitSpace(
        spaceId: number,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/space/member/exit',
            query: {
                'spaceId': spaceId,
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
