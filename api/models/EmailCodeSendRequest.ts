/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 发送邮箱验证码请求
 */
export type EmailCodeSendRequest = {
    /**
     * 邮箱地址
     */
    email: string;
    /**
     * 验证码用途: REGISTER/CHANGE_PASSWORD/BIND_EMAIL/CHANGE_EMAIL_OLD/CHANGE_EMAIL_NEW
     */
    purpose: string;
};

