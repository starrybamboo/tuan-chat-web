/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OpenAiChatCompletionRequest } from '../models/OpenAiChatCompletionRequest';
import type { OpenAiChatCompletionResponse } from '../models/OpenAiChatCompletionResponse';
import type { SseEmitter } from '../models/SseEmitter';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiGatewayOpenAiControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * TuanChat SSE 流式对话
     * 使用与 chat/completions 相同的请求体，返回 OpenAI 风格 chunk SSE
     * @param requestBody
     * @returns SseEmitter OK
     * @throws ApiError
     */
    public streamChat(
        requestBody: OpenAiChatCompletionRequest,
    ): CancelablePromise<SseEmitter> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/gateway/v1/chat/stream',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * OpenAI兼容对话补全
     * 兼容 OpenAI chat/completions 非流式请求
     * @param requestBody
     * @returns OpenAiChatCompletionResponse OK
     * @throws ApiError
     */
    public chatCompletions(
        requestBody: OpenAiChatCompletionRequest,
    ): CancelablePromise<OpenAiChatCompletionResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/gateway/v1/chat/completions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
