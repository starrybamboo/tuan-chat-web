/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 模组物品添加请求
 */
export type ModuleItemCreateRequest = {
    /**
     * 模组id
     */
    moduleId: number;
    /**
     * 物品id
     */
    itemId: number;
    /**
     * 在哪个场景里，全局物品默认值为0
     */
    moduleSceneId?: number;
    /**
     * 模组物品名称
     */
    name: string;
    /**
     * 对kp的提醒（检定，pl需要做什么来获得线索）
     */
    tip?: string;
};

