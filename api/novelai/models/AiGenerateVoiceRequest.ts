/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiGenerateVoiceRequest = {
    text: string;
    seed: string;
    voice: number;
    opus: boolean;
    version: AiGenerateVoiceRequest.version;
};
export namespace AiGenerateVoiceRequest {
    export enum version {
        V1 = 'v1',
        V2 = 'v2',
    }
}

