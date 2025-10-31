/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 能力更新请求
 */
export type AbilityUpdateRequest2 = {
    roleId: number;
    ruleId: number;
    /**
     * 表演相关字段，不能为null，必须为单层
     */
    act?: Record<string, string>;
    /**
     * 基础属性字段，不能为null，必须为单层
     */
    basic?: Record<string, string>;
    /**
     * 能力字段，不能为null，必须为单层
     */
    ability?: Record<string, string>;
    /**
     * 技能字段，不能为null，必须为单层
     */
    skill?: Record<string, string>;
    /**
     * 记录字段，不能为null，必须为单层
     */
    record?: Record<string, string>;
};

