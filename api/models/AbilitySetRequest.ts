/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 能力设置请求
 */
export type AbilitySetRequest = {
    /**
     * 角色ID
     */
    roleId: number;
    /**
     * 规则ID
     */
    ruleId: number;
    /**
     * 表演相关字段
     */
    act?: Record<string, string>;
    /**
     * 基础属性字段
     */
    basic?: Record<string, string>;
    /**
     * 能力字段,依赖于其他字段
     */
    ability?: Record<string, string>;
    /**
     * 技能字段
     */
    skill?: Record<string, string>;
    /**
     * 记录字段
     */
    record?: Record<string, string>;
};

