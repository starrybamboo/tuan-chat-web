/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpsertConsentRequest = {
    /**
     * Jurisdiction for the user consents
     */
    jurisdiction: string;
    /**
     * Consent for analytics tracking
     */
    analyticsConsent: boolean;
    /**
     * Consent for marketing communications
     */
    marketingConsent: boolean;
    /**
     * Consent for personalization
     */
    personalizationConsent: boolean;
    /**
     * Consent for essential cookies
     */
    essentialsConsent: boolean;
    /**
     * Global opt-out status
     */
    globalOptOut: boolean;
};

