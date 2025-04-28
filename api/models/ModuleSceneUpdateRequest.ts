/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 模组场景更新请求
 */
export type ModuleSceneUpdateRequest = {
    /**
     * 场景id
     */
    moduleSceneId: number;
    /**
     * 场景名称
     */
    moduleSceneName?: string;
    /**
     * 场景描述
     */
    sceneDescription?: string;
    /**
     * 只有kp可见的描述或提醒
     */
    tip?: string;
};

