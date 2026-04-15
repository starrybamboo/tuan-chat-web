/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 提交链节点
 */
export type CommitNode = {
    /**
     * 提交ID
     */
    commitId?: number;
    /**
     * 父提交ID
     */
    parentCommitId?: number;
    /**
     * 提交类型 0默认 1归档容器
     */
    commitType?: number;
    /**
     * 提交用户ID
     */
    userId?: number;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

