/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OpenAiChatCompletionRequest } from '../models/OpenAiChatCompletionRequest';
import type { OpenAiChatCompletionResponse } from '../models/OpenAiChatCompletionResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiGatewayOpenAiControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
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
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
