/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiAnnotateImageRequest = {
    /**
     * Model to use
     */
    model: AiAnnotateImageRequest.model;
    /**
     * Annotation parameters (model specific)
     */
    parameters: Record<string, any>;
};
export namespace AiAnnotateImageRequest {
    /**
     * Model to use
     */
    export enum model {
        CANNY = 'canny',
        HED = 'hed',
        MIDAS = 'midas',
        MLSD = 'mlsd',
        OPENPOSE = 'openpose',
        UNIFORMER = 'uniformer',
        FAKE_SCRIBBLE = 'fake_scribble',
    }
}

