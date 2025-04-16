/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultMapObjectObject } from '../models/ApiResultMapObjectObject';
import type { RoleGenerationRequest } from '../models/RoleGenerationRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RoleGenerationControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * AI 根据规则生成角色基本信息
     * 根据规则生成角色基本信息。
     * @param requestBody
     * @returns ApiResultMapObjectObject OK
     * @throws ApiError
     */
    public generateBasicInfoByRule(
        requestBody: RoleGenerationRequest,
    ): CancelablePromise<ApiResultMapObjectObject> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/ai/generateBasicInfoByRule',
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
     * AI 根据规则生成角色基本属性
     * 根据规则生成角色基本属性。
     * @param requestBody
     * @returns ApiResultMapObjectObject OK
     * @throws ApiError
     */
    public generateAbilityByRule(
        requestBody: RoleGenerationRequest,
    ): CancelablePromise<ApiResultMapObjectObject> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/ai/generateAbilityByRule',
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
