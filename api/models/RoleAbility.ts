/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 角色能力
 */
export type RoleAbility = {
    abilityId?: number;
    roleId?: number;
    ruleId?: number;
    /**
     * 表演相关字段，不能为空或null，必须为单层
     */
    act?: Record<string, string>;
    /**
     * 能力字段，不能为空或null，必须为单层
     */
    ability?: Record<string, number>;
};

