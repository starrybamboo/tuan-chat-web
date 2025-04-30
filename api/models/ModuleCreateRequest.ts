/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 新建模组请求
 */
export type ModuleCreateRequest = {
    /**
     * 所用的规则id
     */
    ruleId: number;
    /**
     * 模组名称
     */
    moduleName: string;
    /**
     * 模组的描述
     */
    description?: string;
    /**
     * 模组作者名字
     */
    authorName: string;
};

