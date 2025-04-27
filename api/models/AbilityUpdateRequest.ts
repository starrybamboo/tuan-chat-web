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
    act?: Record<string, Record<string, any>>;
    /**
     * 能力字段，不能为空或null，必须为单层
     */
    ability?: Record<string, Record<string, any>>;
};

