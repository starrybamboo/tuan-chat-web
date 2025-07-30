/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 模组表
 */
export type Module = {
    /**
     * 所用的模块id
     */
    moduleId?: number;
    /**
     * 所用的规则id
     */
    ruleId?: number;
    /**
     * 模组名称
     */
    moduleName?: string;
    /**
     * 模组的描述
     */
    description?: string;
    /**
     * 上传者
     */
    userId?: number;
    /**
     * 作者
     */
    authorName?: string;
    /**
     * md内容
     */
    instruction?: string;
    /**
     * 模组可能需要花费的时间，以小时为单位
     */
    minTime?: number;
    /**
     * 模组需要人数
     */
    minPeople?: number;
    /**
     * 模组封面
     */
    image?: string;
    /**
     * 模组可能需要花费的时间，以小时为单位
     */
    maxTime?: number;
    /**
     * 模组需要人数
     */
    maxPeople?: number;
    /**
     * 从哪个模组fork来
     */
    parent?: string;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 修改时间
     */
    updateTime?: string;
};

