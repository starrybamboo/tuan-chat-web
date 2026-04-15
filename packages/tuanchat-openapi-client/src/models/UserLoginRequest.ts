/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserLoginRequest = {
    /**
     * 登录的用户ID（可选）
     */
    userId?: string;
    /**
     * 登录的用户名（可选，和 userId 二选一）
     */
    username?: string;
    /**
     * 登录的用户密码
     */
    password: string;
};

