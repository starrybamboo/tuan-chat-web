/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiUpscaleImageRequest = {
    /**
     * Image in base64
     */
    image: string;
    /**
     * Width of the input image
     */
    width: number;
    /**
     * Height of the input image
     */
    height: number;
    /**
     * Upscale factor
     */
    scale: AiUpscaleImageRequest.scale;
};
export namespace AiUpscaleImageRequest {
    /**
     * Upscale factor
     */
    export enum scale {
        '_2' = 2,
        '_4' = 4,
    }
}

