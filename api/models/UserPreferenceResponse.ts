/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 用户偏好响应
 */
export type UserPreferenceResponse = {
    /**
     * 用户ID
     */
    userId?: number;
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

