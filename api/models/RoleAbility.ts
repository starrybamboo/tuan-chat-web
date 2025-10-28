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
     * 基础属性字段，不能为空或null，必须为单层
     */
    basic?: Record<string, string>;
    /**
     * 能力字段，不能为空或null，必须为单层
     */
    ability?: Record<string, string>;
    /**
     * 技能字段，不能为空或null，必须为单层
     */
    skill?: Record<string, string>;
    record?: Record<string, string>;
};

