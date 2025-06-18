/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 暂存区响应
 */
export type StageResponse = {
    /**
     * 对于哪个模组的暂存区，一个user对于一个模组，只有一个暂存区
     */
    moduleId?: number;
    /**
     * 模组封面
     */
    image?: string;
    /**
     * 模组名称
     */
    moduleName?: string;
    /**
     * 模组的描述
     */
    description?: string;
};

