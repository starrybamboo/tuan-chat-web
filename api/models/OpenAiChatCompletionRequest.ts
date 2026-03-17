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
     * 模型别名（支持 qwen-flash/qwen-max/gpt-4o-mini/gpt-4o/gpt-5/gpt-5-mini/gpt-5-codex/gpt-5-codex-mini/gpt-5.1/gpt-5.1-codex/gpt-5.1-codex-max/gpt-5.1-codex-mini/gpt-5.2/gpt-5.2-codex/gpt-5.2-high/gpt-5.2-low/gpt-5.2-medium/gpt-5.2-xhigh/gpt-5.3-codex/gpt-5.3-codex-high/gpt-5.3-codex-low/gpt-5.3-codex-medium/gpt-5.3-codex-xhigh/gemini-2.5-flash/gemini-2.5-flash-image/gemini-3-flash-preview/gemini-3-pro-image-preview/gemini-3-pro-preview/gemini-3.1-flash-image-preview）
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
     * 采样种子，可选；兼容上游支持时生效
     */
    seed?: number;
    /**
     * 是否流式输出。阶段1仅支持 false
     */
    stream?: boolean;
    /**
     * 核采样参数，范围 [0,1]，可选
     */
    top_p?: number;
    /**
     * 最大完成 token 数，适用于支持该字段的兼容上游
     */
    max_completion_tokens?: number;
    /**
     * 透传给 OpenAI-compatible 上游的额外顶层字段；也支持直接在请求顶层附带未知字段
     */
    extra_body?: Record<string, Record<string, any>>;
};

