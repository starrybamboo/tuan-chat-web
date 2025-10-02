/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 规则字段更新请求
 */
export type RuleFieldUpdateRequest = {
    /**
     * 规则ID
     */
    ruleId: number;
    /**
     * 表演模板字段映射，新key为null代表删除字段
     */
    actTemplateFields?: Record<string, string>;
    /**
     * 能力公式字段映射，新key为null代表删除字段
     */
    abilityFormulaFields?: Record<string, string>;
    /**
     * 技能默认值字段映射，新key为null代表删除字段
     */
    skillDefaultFields?: Record<string, string>;
    /**
     * 基础默认值字段映射，新key为null代表删除字段
     */
    basicDefaultFields?: Record<string, string>;
};

