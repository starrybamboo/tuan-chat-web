/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiGenerateImageRequest = {
    /**
     * Input for the text generation model
     */
    input: string;
    /**
     * Used image generation model
     */
    model: AiGenerateImageRequest.model;
    /**
     * Action to use, default is generate
     */
    action?: AiGenerateImageRequest.action;
    /**
     * Generation parameters (model specific)
     */
    parameters: Record<string, any>;
    /**
     * Custom image generation URL
     */
    url?: string;
};
export namespace AiGenerateImageRequest {
    /**
     * Used image generation model
     */
    export enum model {
        NAI_DIFFUSION = 'nai-diffusion',
        SAFE_DIFFUSION = 'safe-diffusion',
        NAI_DIFFUSION_FURRY = 'nai-diffusion-furry',
        CUSTOM = 'custom',
        NAI_DIFFUSION_INPAINTING = 'nai-diffusion-inpainting',
        NAI_DIFFUSION_3_INPAINTING = 'nai-diffusion-3-inpainting',
        SAFE_DIFFUSION_INPAINTING = 'safe-diffusion-inpainting',
        FURRY_DIFFUSION_INPAINTING = 'furry-diffusion-inpainting',
        KANDINSKY_VANILLA = 'kandinsky-vanilla',
        NAI_DIFFUSION_2 = 'nai-diffusion-2',
        NAI_DIFFUSION_3 = 'nai-diffusion-3',
    }
    /**
     * Action to use, default is generate
     */
    export enum action {
        GENERATE = 'generate',
        IMG2IMG = 'img2img',
        INFILL = 'infill',
    }
}

