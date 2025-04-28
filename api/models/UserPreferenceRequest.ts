/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 用户偏好请求
 */
export type UserPreferenceRequest = {
    /**
     * 游戏性(G)得分(0-10)
     */
    gameplayScore?: string;
    /**
     * 叙事性(N)得分(0-10)
     */
    narrativeScore?: string;
    /**
     * 模拟性(S)得分(0-10)
     */
    simulationScore?: string;
    /**
     * 偏好描述
     */
    preferenceDesc?: string;
};

