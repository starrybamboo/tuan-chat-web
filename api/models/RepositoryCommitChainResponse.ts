/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommitNode } from './CommitNode';
/**
 * 仓库提交链返回
 */
export type RepositoryCommitChainResponse = {
    /**
     * 仓库ID
     */
    repositoryId?: number;
    /**
     * 仓库当前head commit ID
     */
    headCommitId?: number;
    /**
     * 提交链（从新到旧）
     */
    commits?: Array<CommitNode>;
    /**
     * 是否因为超过查询上限而截断
     */
    truncated?: boolean;
    /**
     * 是否检测到断链（父提交缺失或循环）
     */
    broken?: boolean;
};

