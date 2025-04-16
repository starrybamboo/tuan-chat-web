/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 能力字段更新请求
 */
export type AbilityFieldUpdateRequest = {
    abilityId: number;
    /**
     * 新key为null代表删除
     */
    actFields?: Record<string, string>;
    /**
     * 新key为null代表删除
     */
    abilityFields?: Record<string, string>;
};

