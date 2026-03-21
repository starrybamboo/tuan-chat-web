/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultVoid } from '../models/ApiResultVoid';
import type { EmailBindRequest } from '../models/EmailBindRequest';
import type { EmailChangeRequest } from '../models/EmailChangeRequest';
import type { EmailCodeSendRequest } from '../models/EmailCodeSendRequest';
import type { EmailCodeVerifyRequest } from '../models/EmailCodeVerifyRequest';
import type { ForgotPasswordRequest } from '../models/ForgotPasswordRequest';
import type { PasswordChangeByEmailRequest } from '../models/PasswordChangeByEmailRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserSecurityControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * 忘记密码（发送账号信息到邮箱）
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public forgotPassword(
        requestBody: ForgotPasswordRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/security/password/forgot',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 通过邮箱验证码修改密码
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public changePassword(
        requestBody: PasswordChangeByEmailRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/security/password/change',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 校验邮箱验证码
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public verifyEmailCode(
        requestBody: EmailCodeVerifyRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/security/email/code/verify',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 发送邮箱验证码
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public sendEmailCode(
        requestBody: EmailCodeSendRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/security/email/code/send',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 换绑邮箱
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public changeEmail(
        requestBody: EmailChangeRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/security/email/change',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * 绑定邮箱
     * @param requestBody
     * @returns ApiResultVoid OK
     * @throws ApiError
     */
    public bindEmail(
        requestBody: EmailBindRequest,
    ): CancelablePromise<ApiResultVoid> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/security/email/bind',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
