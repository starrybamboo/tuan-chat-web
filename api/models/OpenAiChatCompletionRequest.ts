/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Message } from './Message';
/**
 * OpenAI 兼容 chat/completions 请求
 */
export type OpenAiChatCompletionRequest = {
    /**
     * 模型别名（支持 qwen-flash/qwen-max/gpt-4o-mini/gpt-4o/gpt-5/gpt-5-mini/gemini-2.5-flash/gemini-2.5-flash-image/gemini-3-flash-preview/gemini-3-pro-image-preview/gemini-3-pro-preview）
     */
    model: string;
    /**
     * 消息列表，至少包含一条消息
     */
    messages: Array<Message>;
    /**
     * 采样温度，范围 [0,2]，可选
     */
    temperature?: number;
    /**
     * 是否流式输出。阶段1仅支持 false
     */
    stream?: boolean;
    /**
     * 核采样参数，范围 [0,1]，可选
     */
    top_p?: number;
};


