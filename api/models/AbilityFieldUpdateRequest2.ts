/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AbilityFieldUpdateRequest2 = {
    roleId: number;
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
};

