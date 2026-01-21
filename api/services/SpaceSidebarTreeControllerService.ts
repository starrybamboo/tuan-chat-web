/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultSpaceSidebarTreeResponse } from '../models/ApiResultSpaceSidebarTreeResponse';
import type { SpaceSidebarTreeSetRequest } from '../models/SpaceSidebarTreeSetRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceSidebarTreeControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取空间侧边栏频道树
     * @param spaceId
     * @returns ApiResultSpaceSidebarTreeResponse OK
     * @throws ApiError
     */
    public getSidebarTree(
        spaceId: number,
    ): CancelablePromise<ApiResultSpaceSidebarTreeResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/space/sidebarTree',
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
     * 设置空间侧边栏频道树
     * @param requestBody
     * @returns ApiResultSpaceSidebarTreeResponse OK
     * @throws ApiError
     */
    public setSidebarTree(
        requestBody: SpaceSidebarTreeSetRequest,
    ): CancelablePromise<ApiResultSpaceSidebarTreeResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/space/sidebarTree',
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
