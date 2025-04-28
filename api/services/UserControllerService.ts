/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultUserInfoResponse } from '../models/ApiResultUserInfoResponse';
import type { UserInfoResponse } from '../models/UserInfoResponse';
import type { UserLoginRequest } from '../models/UserLoginRequest';
import type { UserRegisterRequest } from '../models/UserRegisterRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取用户信息
     * @param userId
     * @returns ApiResultUserInfoResponse OK
     * @throws ApiError
     */
    public getUserInfo(
        userId: number,
    ): CancelablePromise<ApiResultUserInfoResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/capi/user/info',
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
     * 修改用户信息
     * @param userInfoResponse
     * @returns ApiResultUserInfoResponse OK
     * @throws ApiError
     */
    public updateUserInfo(
        userInfoResponse: UserInfoResponse,
    ): CancelablePromise<ApiResultUserInfoResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/capi/user/info',
            query: userInfoResponse,
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 用户注册
     * 用户注册接口
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public register(
        requestBody: UserRegisterRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/register',
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
     * 用户登录
     * 用户登录接口
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public login(
        requestBody: UserLoginRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/capi/user/login',
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
