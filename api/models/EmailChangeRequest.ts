/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 换绑邮箱请求
 */
export type EmailChangeRequest = {
    /**
     * 旧邮箱
     */
    oldEmail: string;
    /**
     * 旧邮箱验证码
     */
    oldCode: string;
    /**
     * 新邮箱
     */
    newEmail: string;
    /**
     * 新邮箱验证码
     */
    newCode: string;
};

