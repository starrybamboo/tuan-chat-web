/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiGeneratePromptRequest = {
    /**
     * Used text generation model
     */
    model: AiGeneratePromptRequest.model;
    /**
     * Input for the text generation model
     */
    prompt: string;
    temp: number;
    tokens_to_generate: number;
};
export namespace AiGeneratePromptRequest {
    /**
     * Used text generation model
     */
    export enum model {
        _2_7B = '2.7B',
        _6B_V4 = '6B-v4',
        EUTERPE_V2 = 'euterpe-v2',
        GENJI_PYTHON_6B = 'genji-python-6b',
        GENJI_JP_6B = 'genji-jp-6b',
        GENJI_JP_6B_V2 = 'genji-jp-6b-v2',
        KRAKE_V2 = 'krake-v2',
        HYPEBOT = 'hypebot',
        INFILLMODEL = 'infillmodel',
        CASSANDRA = 'cassandra',
        SIGURD_2_9B_V1 = 'sigurd-2.9b-v1',
        BLUE = 'blue',
        RED = 'red',
        GREEN = 'green',
        PURPLE = 'purple',
        CLIO_V1 = 'clio-v1',
        KAYRA_V1 = 'kayra-v1',
    }
}

