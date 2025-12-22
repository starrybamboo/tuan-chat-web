/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultListUserRole } from '../models/ApiResultListUserRole';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SpaceModuleControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取空间的所有NPC，仅kp调用
     * @param spaceId
     * @returns ApiResultListUserRole OK
     * @throws ApiError
     */
    public spaceRole(
        spaceId: number,
    ): CancelablePromise<ApiResultListUserRole> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/space/module/role',
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
