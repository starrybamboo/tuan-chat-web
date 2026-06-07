/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiModuleDto = {
    /**
     * Base64-encoded data if ready or it's a training request, error text if error
     */
    data: string;
    /**
     * Learning rate
     */
    lr: number;
    /**
     * Training steps
     */
    steps: number;
    /**
     * Used text generation model for module training
     */
    model: string;
    /**
     * UNIX timestamp
     */
    lastUpdatedAt: number;
    status: AiModuleDto.status;
    /**
     * Recorded loss values
     */
    lossHistory: Array<number>;
    id: string;
    name: string;
    description: string;
};
export namespace AiModuleDto {
    export enum status {
        PENDING = 'pending',
        TRAINING = 'training',
        READY = 'ready',
        ERROR = 'error',
    }
}

