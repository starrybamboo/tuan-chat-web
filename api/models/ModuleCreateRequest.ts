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
    authorName?: string;
    /**
     * 模组可能需要花费的时间，以小时为单位
     */
    costTime?: number;
    /**
     * 模组需要人数
     */
    people?: number;
    /**
     * 模组封面
     */
    image?: string;
};

