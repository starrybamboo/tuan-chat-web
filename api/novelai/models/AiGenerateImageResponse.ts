/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiGenerateImageResponse = {
    /**
     * Incrementing version pointer
     */
    ptr?: number;
    /**
     * Generated image in base64
     */
    image?: string;
    /**
     * Set to true if the image is final and the generation ended
     */
    final?: boolean;
    /**
     * Error from the generation node, if defined. Usually means the end of stream
     */
    error?: string;
};

