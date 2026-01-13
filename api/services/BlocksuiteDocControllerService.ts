/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { BlocksuiteDocUpsertRequest } from '../models/BlocksuiteDocUpsertRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class BlocksuiteDocControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取Blocksuite文档快照
     * @param entityType
     * @param entityId
     * @param docType
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public getDoc(
        entityType: string,
        entityId: number,
        docType: string,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/blocksuite/doc',
            query: {
                'entityType': entityType,
                'entityId': entityId,
                'docType': docType,
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
     * 新增或修改Blocksuite文档快照
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public upsertDoc(
        requestBody: BlocksuiteDocUpsertRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/blocksuite/doc',
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
