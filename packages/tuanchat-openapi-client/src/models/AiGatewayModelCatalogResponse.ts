/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModelOption } from './ModelOption';
/**
 * AI 场景模型目录响应
 */
export type AiGatewayModelCatalogResponse = {
    /**
     * 场景编码；为空表示返回全量模型目录
     */
    scene?: string;
    /**
     * 场景展示名称
     */
    label?: string;
    /**
     * 默认模型别名
     */
    defaultModel?: string;
    /**
     * 当前场景可用模型列表
     */
    models?: Array<ModelOption>;
};

