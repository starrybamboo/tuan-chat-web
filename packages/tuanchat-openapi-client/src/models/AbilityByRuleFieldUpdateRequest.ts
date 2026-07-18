/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 按角色和规则更新能力字段请求
 */
export type AbilityByRuleFieldUpdateRequest = {
    /**
     * 角色 ID
     */
    roleId: number;
    /**
     * 规则 ID
     */
    ruleId: number;
    /**
     * 新key为null代表删除
     */
    actFields?: Record<string, string>;
    /**
     * 新key为null代表删除
     */
    basicFields?: Record<string, string>;
    /**
     * 新key为null代表删除
     */
    abilityFields?: Record<string, string>;
    /**
     * 新key为null代表删除
     */
    skillFields?: Record<string, string>;
    /**
     * 新key为null代表删除
     */
    extraFields?: Record<string, string>;
};
