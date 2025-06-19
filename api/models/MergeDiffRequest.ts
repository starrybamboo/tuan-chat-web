/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 合并差异请求
 */
export type MergeDiffRequest = {
    /**
     * 源分支提交ID，至少有一个是头提交
     */
    sourceCommitId: number;
    /**
     * 目标分支提交ID，至少有一个是头提交
     */
    targetCommitId: number;
    /**
     * 源分支ID
     */
    sourceBranchId: number;
    /**
     * 目标分支ID
     */
    targetBranchId: number;
    /**
     * 属于哪个模组
     */
    moduleId: number;
};

