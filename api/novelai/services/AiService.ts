/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AiAnnotateImageRequest } from '../models/AiAnnotateImageRequest';
import type { AiGenerateImageRequest } from '../models/AiGenerateImageRequest';
import type { AiGenerateImageResponse } from '../models/AiGenerateImageResponse';
import type { AiGeneratePromptRequest } from '../models/AiGeneratePromptRequest';
import type { AiGeneratePromptResponse } from '../models/AiGeneratePromptResponse';
import type { AiGenerateRequest } from '../models/AiGenerateRequest';
import type { AiGenerateResponse } from '../models/AiGenerateResponse';
import type { AiGenerateStreamableResponse } from '../models/AiGenerateStreamableResponse';
import type { AiGenerateVoiceRequest } from '../models/AiGenerateVoiceRequest';
import type { AiRequestImageGenerationTagsResponse } from '../models/AiRequestImageGenerationTagsResponse';
import type { AiSequenceClassificationResponse } from '../models/AiSequenceClassificationResponse';
import type { AiUpscaleImageRequest } from '../models/AiUpscaleImageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Generate text. IMPORTANT NOTICE FOR EXISTING API TEXTGEN USERS.
     * Generate text using NovelAI's language models.
    IMPORTANT NOTE FOR EXISTING API USERS: We are deprecating Kayra for subscribed users from this API.
    Read more information on the Text Generation documentation at the start of this page.
     * @param requestBody
     * @returns AiGenerateResponse The output has been successfully generated.
     * @throws ApiError
     */
    public aiControllerAiGenerate(
        requestBody: AiGenerateRequest,
    ): CancelablePromise<AiGenerateResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/generate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                402: `An active subscription is required to access this endpoint.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns AiGeneratePromptResponse Prompt has been generated.
     * @throws ApiError
     */
    public aiControllerAiGeneratePrompt(
        requestBody: AiGeneratePromptRequest,
    ): CancelablePromise<AiGeneratePromptResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/generate-prompt',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns AiGenerateStreamableResponse The request has been accepted and the output is generating (SSE).
     * @throws ApiError
     */
    public aiControllerAiGenerateStreamable(
        requestBody: AiGenerateRequest,
    ): CancelablePromise<AiGenerateStreamableResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/generate-stream',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                402: `An active subscription is required to access this endpoint.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any The request has been accepted and the output is generating (ZIP attachment).
     * @throws ApiError
     */
    public aiControllerAnnotateImage(
        requestBody: AiAnnotateImageRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/annotate-image',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                402: `An active subscription is required to access this endpoint.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns AiGenerateImageResponse The request has been accepted and the output is generating (SSE / ZIP attachment).
     * @throws ApiError
     */
    public aiControllerAiGenerateImage(
        requestBody: AiGenerateImageRequest,
    ): CancelablePromise<AiGenerateImageResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/generate-image',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                402: `An active subscription is required to access this endpoint.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any The request has been accepted and the output is generating (ZIP attachment).
     * @throws ApiError
     */
    public aiControllerAiUpscaleImage(
        requestBody: AiUpscaleImageRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/upscale',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                402: `An active subscription is required to access this endpoint.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns AiSequenceClassificationResponse The output has been successfully generated.
     * @throws ApiError
     */
    public aiControllerClassify(): CancelablePromise<AiSequenceClassificationResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/classify',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                402: `An active subscription is required to access this endpoint.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param model
     * @param prompt
     * @returns AiRequestImageGenerationTagsResponse
     * @throws ApiError
     */
    public aiControllerGenerateImageTags(
        model: string,
        prompt: string,
    ): CancelablePromise<AiRequestImageGenerationTagsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/ai/generate-image/suggest-tags',
            query: {
                'model': model,
                'prompt': prompt,
            },
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @deprecated
     * Generate voice from text. The GET endpoint has been deprecated, please use the POST endpoint instead.
     * @param text
     * @param seed
     * @param voice
     * @param opus
     * @param version
     * @returns any
     * @throws ApiError
     */
    public aiControllerGenerateVoice(
        text: string,
        seed: string,
        voice: number,
        opus: boolean,
        version: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/ai/generate-voice',
            query: {
                'text': text,
                'seed': seed,
                'voice': voice,
                'opus': opus,
                'version': version,
            },
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public aiControllerGenerateVoicePost(
        requestBody: AiGenerateVoiceRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/ai/generate-voice',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
}
