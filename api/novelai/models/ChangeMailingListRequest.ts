/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChangeMailingListRequest = {
    /**
     * Current email address. Not required if user has plaintext email stored
     */
    email?: string;
    /**
     * Marketing email consent state
     */
    marketingConsent: boolean;
    uiLanguage?: Record<string, any>;
};

