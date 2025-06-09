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
     * 表演相关字段，不能或null
     */
    act: Record<string, string>;
    /**
     * 能力字段，不能为null
     */
    ability: Record<string, number>;
};

