/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RecoveryStartRequest = {
    /**
     * Target email for account recovery
     */
    email: string;
    /**
     * Locale used by the user, e.g. 'en' or 'jp
     */
    locale?: RecoveryStartRequest.locale;
};
export namespace RecoveryStartRequest {
    /**
     * Locale used by the user, e.g. 'en' or 'jp
     */
    export enum locale {
        EN = 'en',
        JP = 'jp',
    }
}

