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
    /**
     * 数值相关默认值，如力量、敏捷等属性值，null代表删除这个字段，力量: 0代表添加力量字段或者修改力量字段为0
     */
    abilityDefault?: Record<string, Record<string, any>>;
};

