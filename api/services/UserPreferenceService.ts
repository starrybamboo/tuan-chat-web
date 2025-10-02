/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultBoolean } from '../models/ApiResultBoolean';
import type { ApiResultUserPreferenceResponse } from '../models/ApiResultUserPreferenceResponse';
import type { UserPreferenceRequest } from '../models/UserPreferenceRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserPreferenceService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取用户偏好
     * @param userId
     * @returns ApiResultUserPreferenceResponse OK
     * @throws ApiError
     */
    public getUserPreference(
        userId: number,
    ): CancelablePromise<ApiResultUserPreferenceResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/user/preference',
            query: {
                'userId': userId,
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
     * 更新用户偏好
     * @param requestBody
     * @returns ApiResultUserPreferenceResponse OK
     * @throws ApiError
     */
    public updateUserPreference(
        requestBody: UserPreferenceRequest,
    ): CancelablePromise<ApiResultUserPreferenceResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/user/preference',
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
     * 创建用户偏好
     * @param requestBody
     * @returns ApiResultUserPreferenceResponse OK
     * @throws ApiError
     */
    public createUserPreference(
        requestBody: UserPreferenceRequest,
    ): CancelablePromise<ApiResultUserPreferenceResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/preference',
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
     * 删除用户偏好
     * @param userId
     * @returns ApiResultBoolean OK
     * @throws ApiError
     */
    public deleteUserPreference(
        userId: number,
    ): CancelablePromise<ApiResultBoolean> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/capi/user/preference',
            query: {
                'userId': userId,
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
