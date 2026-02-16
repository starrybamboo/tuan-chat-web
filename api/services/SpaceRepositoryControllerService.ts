/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { SpaceRole } from '../models/SpaceRole';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceRepositoryControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取空间的所有NPC，仅kp调用
     * @param spaceId
     * @param commitId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public spaceRole(
        spaceId: number,
        commitId?: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/repository/role',
            query: {
                'spaceId': spaceId,
                'commitId': commitId,
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
     * 将角色作为NPC添加到空间
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public addSpaceRole(
        requestBody: SpaceRole,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/space/repository/role',
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
