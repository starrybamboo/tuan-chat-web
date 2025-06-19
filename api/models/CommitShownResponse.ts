/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 分支提交展示响应体
 */
export type CommitShownResponse = {
    /**
     * 提交唯一ID
     */
    commitId?: number;
    /**
     * 提交信息
     */
    message?: string;
    /**
     * 提交时间
     */
    commitTime?: string;
    /**
     * 提交的用户ID
     */
    userId?: number;
    /**
     * 父1提交ID
     */
    firstParentId?: number;
    /**
     * 父2提交ID, merge时使用
     */
    secondParentId?: number;
    /**
     * 提交深度
     */
    depth?: number;
    /**
     * 所属分支id
     */
    branchId?: number;
};

