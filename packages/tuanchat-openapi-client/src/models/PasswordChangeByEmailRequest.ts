/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 邮箱验证码修改密码请求
 */
export type PasswordChangeByEmailRequest = {
    /**
     * 邮箱地址
     */
    email: string;
    /**
     * 邮箱验证码
     */
    code: string;
    /**
     * 新密码
     */
    newPassword: string;
};

