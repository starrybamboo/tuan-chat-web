/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 合并分支请求
 */
export type BranchMergeRequest = {
    /**
     * 源分支ID
     */
    sourceBranchId: number;
    /**
     * 目标分支ID
     */
    targetBranchId: number;
    /**
     * 源分支提交ID，至少有一个是头提交
     */
    sourceCommitId: number;
    /**
     * 目标分支提交ID，至少有一个是头提交
     */
    targetCommitId: number;
    /**
     * 合并提交的描述
     */
    message?: string;
    /**
     * 提交的内容
     */
    content?: Record<string, Record<string, number>>;
    /**
     * 属于哪个模组
     */
    moduleId: number;
    /**
     * 是否为快进提交
     */
    fastMerge: boolean;
};

