/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResultString } from '../models/ApiResultString';
import type { CompletionRequest } from '../models/CompletionRequest';
import type { MiddleCompletionRequest } from '../models/MiddleCompletionRequest';
import type { RewriteRequest } from '../models/RewriteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiWritingControllerService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * ai润色
     * 根据跑团聊天记录和用户输入润色文本
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public rewrite(
        requestBody: RewriteRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/writing/rewrite',
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
    /**
     * 虚影补全（中间插入）
     * 根据跑团聊天记录和用户上下文输入自动补全文本
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public middleCompletion(
        requestBody: MiddleCompletionRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/writing/middleCompletion',
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
    /**
     * 直接调用qwen-max
     * 直接调用ai生成文本，无预设提示词
     * @param result
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public max(
        result: string,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/writing/max',
            query: {
                'result': result,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 直接调用qwen-flash
     * 直接调用ai生成文本，无预设提示词
     * @param result
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public flash(
        result: string,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/writing/flash',
            query: {
                'result': result,
            },
            errors: {
                400: `Bad Request`,
                405: `Method Not Allowed`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * 虚影补全
     * 根据跑团聊天记录自动补全文本
     * @param requestBody
     * @returns ApiResultString OK
     * @throws ApiError
     */
    public completion(
        requestBody: CompletionRequest,
    ): CancelablePromise<ApiResultString> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/writing/completion',
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
