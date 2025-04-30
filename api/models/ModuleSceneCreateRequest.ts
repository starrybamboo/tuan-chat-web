/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 模组场景创建请求
 */
export type ModuleSceneCreateRequest = {
    /**
     * 模组id
     */
    moduleId: number;
    /**
     * 场景名称
     */
    moduleSceneName: string;
    /**
     * 场景描述
     */
    sceneDescription?: string;
    /**
     * 只有kp可见的描述或提醒
     */
    tip?: string;
};

