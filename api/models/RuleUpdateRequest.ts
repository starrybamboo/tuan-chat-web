/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 规则更新请求对象
 */
export type RuleUpdateRequest = {
    /**
     * 规则ID
     */
    ruleId: number;
    /**
     * 规则名称
     */
    ruleName?: string;
    /**
     * 规则描述
     */
    ruleDescription?: string;
    /**
     * 表演相关字段模板，如性别、年龄等信息
     */
    actTemplate?: Record<string, string>;
    abilityFormula?: Record<string, string>;
    skillDefault?: Record<string, string>;
    basicDefault?: Record<string, string>;
    dicerConfig?: Record<string, string>;
};

