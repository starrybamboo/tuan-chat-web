/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultString } from '../models/ApiResultString';
import type { ApiResultUserInfoResponse } from '../models/ApiResultUserInfoResponse';
import type { ApiResultUserPrivateInfoResponse } from '../models/ApiResultUserPrivateInfoResponse';
import type { ApiResultUserProfileInfoResponse } from '../models/ApiResultUserProfileInfoResponse';
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { UserLoginRequest } from '../models/UserLoginRequest';
import type { UserRegisterRequest } from '../models/UserRegisterRequest';
import type { UserUpdateInfoRequest } from '../models/UserUpdateInfoRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 获取用户必要信息
     * @param userId
     * @returns ApiResultUserInfoResponse OK
     * @throws ApiError
     */
    public getUserInfo(
        userId: number,
    ): CancelablePromise<ApiResultUserInfoResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/info',
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
     * @param requestBody
     * @returns ApiResultUserPrivateInfoResponse OK
     * @throws ApiError
     */
    public updateUserInfo(
        requestBody: UserUpdateInfoRequest,
    ): CancelablePromise<ApiResultUserPrivateInfoResponse> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/user/info',
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
            url: '/user/register',
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
     * 退出登录
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public logout(): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/logout',
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
     * 用户登录接口，支持 userId 或 username 进行登录
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public login(
        requestBody: UserLoginRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/login',
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
     * 获取用户主页信息
     * @param userId
     * @returns ApiResultUserProfileInfoResponse OK
     * @throws ApiError
     */
    public getUserProfileInfo(
        userId: number,
    ): CancelablePromise<ApiResultUserProfileInfoResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/info/profile',
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
     * 获取当前登录用户信息（仅本人）
     * @returns ApiResultUserPrivateInfoResponse OK
     * @throws ApiError
     */
    public getMyUserInfo(): CancelablePromise<ApiResultUserPrivateInfoResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/info/me',
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 通过用户名获取用户必要信息
     * @param username
     * @returns ApiResultUserInfoResponse OK
     * @throws ApiError
     */
    public getUserInfoByUsername(
        username: string,
    ): CancelablePromise<ApiResultUserInfoResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/info/by-username',
            query: {
                'username': username,
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
