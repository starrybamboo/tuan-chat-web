/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultGroup } from '../models/ApiResultGroup';
import type { ApiResultListGroup } from '../models/ApiResultListGroup';
import type { GroupAddRequest } from '../models/GroupAddRequest';
import type { SubRoomRequest } from '../models/SubRoomRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GroupControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param requestBody
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public createSubgroup(
        requestBody: SubRoomRequest,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/subgroup',
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
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public createGroup(
        requestBody: GroupAddRequest,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/group/',
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
     * @param groupId
     * @returns ApiResultGroup OK
     * @throws ApiError
     */
    public getGroupInfo(
        groupId: number,
    ): CancelablePromise<ApiResultGroup> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/{groupId}',
            path: {
                'groupId': groupId,
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
     * @returns ApiResultListGroup OK
     * @throws ApiError
     */
    public getUserGroups(): CancelablePromise<ApiResultListGroup> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/group/list',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
