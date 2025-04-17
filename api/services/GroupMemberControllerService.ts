/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminAddRequset } from '../models/AdminAddRequset';
import type { AdminRevokeRequest } from '../models/AdminRevokeRequest';
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListGroupMember } from '../models/ApiResultListGroupMember';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { GroupOwnerTransferRequest } from '../models/GroupOwnerTransferRequest';
import type { MemberAddRequest } from '../models/MemberAddRequest';
import type { MemberDeleteRequest } from '../models/MemberDeleteRequest';
import type { MemberExitRequest } from '../models/MemberExitRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GroupMemberControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 转让群主(KP)
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public transferGroupOwner(
        requestBody: GroupOwnerTransferRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/group/member/transfer',
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
     * 设置用户为玩家
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public setPlayer(
        requestBody: AdminAddRequset,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/group/member/player',
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
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public revokePlayer(
        requestBody: AdminRevokeRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/group/member/player',
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
     * 新增群成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addMember(
        requestBody: MemberAddRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/member/',
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
     * 删除群成员
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public deleteMember(
        requestBody: MemberDeleteRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/group/member/',
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
     * 获取群成员列表
     * @param roomId
     * @returns ApiResultListGroupMember OK
     * @throws ApiError
     */
    public getMemberList(
        roomId: number,
    ): CancelablePromise<ApiResultListGroupMember> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/member/list',
            query: {
                'roomId': roomId,
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
     * 退出群聊
     * @param requestBody
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public exitMember(
        requestBody: MemberExitRequest,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/group/member/exit',
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
