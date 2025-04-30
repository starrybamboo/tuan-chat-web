/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 查询模组场景翻页请求
 */
export type ModuleScenePageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 模组id
     */
    moduleId: number;
    /**
     * 场景名称，支持模糊查询
     */
    moduleSceneName?: string;
};

