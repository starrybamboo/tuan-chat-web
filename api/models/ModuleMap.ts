/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 一个场景是一个逻辑上的概念，没有实体，包含各个实体的引用，聚合了一个阶段的跑团可能用到的所有物品、NPC、和地点信息
 */
export type ModuleMap = {
    /**
     * 存储场景名，到相邻场景的list
     */
    sceneMap?: Record<string, Array<string>>;
    /**
     * 存储场景名，到场景内物品list
     */
    sceneItem?: Record<string, Array<string>>;
    /**
     * 存储场景名，到场景内人物list
     */
    sceneRole?: Record<string, Array<string>>;
    /**
     * 一个场景包含了哪些地点
     */
    sceneLocation?: Record<string, Array<string>>;
};

