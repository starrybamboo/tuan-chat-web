/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 虚影补全请求（中间插入）
 */
export type MiddleCompletionRequest = {
    /**
     * 角色姓名
     */
    roleName: string;
    /**
     * 聊天记录
     */
    chatHistory: string;
    /**
     * 插入前文本
     */
    preInput?: string;
    /**
     * 插入后文本
     */
    postInput?: string;
};

