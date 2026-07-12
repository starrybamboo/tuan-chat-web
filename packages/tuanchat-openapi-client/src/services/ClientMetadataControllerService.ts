/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultClientMetadataBatchResponse } from '../models/ApiResultClientMetadataBatchResponse';
import type { ClientMetadataBatchRequest } from '../models/ClientMetadataBatchRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ClientMetadataControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 批量获取角色、用户和头像元数据
     * @param requestBody
     * @returns ApiResultClientMetadataBatchResponse OK
     * @throws ApiError
     */
    public getBatch(
        requestBody: ClientMetadataBatchRequest,
    ): CancelablePromise<ApiResultClientMetadataBatchResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/metadata/batch',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
