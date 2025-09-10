/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 能力更新请求
 */
export type AbilityUpdateRequest = {
    /**
     * 能力ID
     */
    abilityId: number;
    /**
     * 表演相关字段，不能为空或null，必须为单层
     */
    act?: Record<string, string>;
    /**
     * 基础属性字段
     */
    basic?: Record<string, string>;
    /**
     * 能力字段
     */
    ability?: Record<string, string>;
    /**
     * 技能字段
     */
    skill?: Record<string, string>;
};

