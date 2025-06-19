/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 提交差异展示响应体
 */
export type DiffResult = {
    /**
     * 差异类型 1.删除 2.修改 3.新增
     */
    diffType?: number;
    /**
     * 条目ID
     */
    id?: number;
    /**
     * 旧内容
     */
    oldContent?: Record<string, Record<string, any>>;
    /**
     * 新的修改
     */
    newContent?: Record<string, Record<string, any>>;
};

