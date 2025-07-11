/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 创建分支请求
 */
export type BranchCreateRequest = {
    /**
     * 模组ID
     */
    moduleId: number;
    /**
     * 分支名称
     */
    branchName: string;
    /**
     * 从哪个分支创建，不提供则直接从main分支最新提交创建
     */
    baseBranchId?: number;
    /**
     * 基于的提交ID，不提供则基于最新提交
     */
    baseCommitId?: number;
    /**
     * 分支描述
     */
    description?: string;
};

