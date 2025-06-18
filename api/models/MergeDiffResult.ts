/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DiffResult } from './DiffResult';
/**
 * 合并差异响应体
 */
export type MergeDiffResult = {
    /**
     * 差异响应
     */
    diffResult?: Record<string, Array<DiffResult>>;
    /**
     * 两个提交取并集的内容引用
     */
    content?: Record<string, Record<string, number>>;
    /**
     * 是否为快进提交
     */
    fastMerge?: boolean;
};

