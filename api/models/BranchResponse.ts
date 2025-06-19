/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 分支相应体
 */
export type BranchResponse = {
    /**
     * 分支id
     */
    branchId?: number;
    /**
     * 分支名称
     */
    name?: string;
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

