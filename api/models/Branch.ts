/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 分支表
 */
export type Branch = {
    branchId?: number;
    /**
     * 分支名称
     */
    name?: string;
    /**
     * 所属模组ID
     */
    moduleId?: number;
    /**
     * 当前指向的提交ID
     */
    headCommitId?: number;
    /**
     * 是否是主分支(0:否, 1:是)
     */
    isMain?: string;
    /**
     * 创建者ID
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

