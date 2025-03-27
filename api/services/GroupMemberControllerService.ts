/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminAddRequset } from '../models/AdminAddRequset';
import type { AdminRevokeRequest } from '../models/AdminRevokeRequest';
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultListGroupMember } from '../models/ApiResultListGroupMember';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { MemberAddRequest } from '../models/MemberAddRequest';
import type { MemberDeleteRequest } from '../models/MemberDeleteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GroupMemberControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
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
}
