/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiGenerateStreamableResponse = {
    /**
     * Incrementing token pointer
     */
    ptr?: number;
    /**
     * Generated token
     */
    token?: string;
    /**
     * Set to true if the token is final and the generation ended
     */
    final?: boolean;
    /**
     * Error from the generation node, if defined. Usually means the end of stream
     */
    error?: string;
};

