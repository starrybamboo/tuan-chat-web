/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Choice } from './Choice';
import type { Usage } from './Usage';
/**
 * OpenAI 兼容 chat/completions 响应
 */
export type OpenAiChatCompletionResponse = {
    id?: string;
    object?: string;
    created?: number;
    model?: string;
    choices?: Array<Choice>;
    usage?: Usage;
};

