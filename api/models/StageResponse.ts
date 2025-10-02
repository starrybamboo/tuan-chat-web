/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 暂存区响应
 */
export type StageResponse = {
    /**
     * 模组Id，如果用户是模组创建者，moduleId不为空，可以对模组进行修改
     */
    moduleId?: number;
    /**
     * 暂存区id
     */
    stageId?: number;
    /**
     * 模组创建者id
     */
    userId?: number;
    /**
     * 处于哪个分支
     */
    branchId?: number;
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
    /**
     * 模组可能需要花费的时间，以小时为单位
     */
    maxTime?: number;
    /**
     * 模组需要人数
     */
    maxPeople?: number;
    /**
     * 模组可能需要花费的时间，以小时为单位
     */
    minTime?: number;
    /**
     * 模组需要人数
     */
    minPeople?: number;
    /**
     * 从哪个模组fork来
     */
    parent?: string;
    /**
     * 作者
     */
    authorName?: string;
};

