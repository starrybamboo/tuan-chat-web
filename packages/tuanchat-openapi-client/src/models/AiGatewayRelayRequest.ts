/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * AI网关文本中转请求
 */
export type AiGatewayRelayRequest = {
    /**
     * 业务场景编码，可选；传入后会按场景限制模型白名单
     */
    scene?: string;
    /**
     * 目标模型别名（支持 qwen-flash/qwen-max/gpt-4o-mini/gpt-4o/gpt-5/gpt-5-mini/gpt-5-codex/gpt-5-codex-mini/gpt-5.1/gpt-5.1-codex/gpt-5.1-codex-max/gpt-5.1-codex-mini/gpt-5.2/gpt-5.2-codex/gpt-5.2-high/gpt-5.2-low/gpt-5.2-medium/gpt-5.2-xhigh/gpt-5.3-codex/gpt-5.3-codex-high/gpt-5.3-codex-low/gpt-5.3-codex-medium/gpt-5.3-codex-xhigh）
     */
    model: string;
    /**
     * 要转发给模型的用户输入文本
     */
    prompt: string;
};

