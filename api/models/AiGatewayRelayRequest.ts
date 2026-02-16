/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * AI网关文本中转请求
 */
export type AiGatewayRelayRequest = {
    /**
     * 目标模型别名（支持 qwen-flash/qwen-max/gpt-4o-mini/gpt-4o/gpt-5/gpt-5-mini/gemini-2.5-flash/gemini-2.5-flash-image/gemini-3-flash-preview/gemini-3-pro-image-preview/gemini-3-pro-preview）
     */
    model: string;
    /**
     * 要转发给模型的用户输入文本
     */
    prompt: string;
};


