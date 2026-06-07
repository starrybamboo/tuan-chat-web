/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateUserRequest = {
    /**
     * ReCAPTCHA response token for the novelai.net domain
     */
    recaptcha: string;
    /**
     * Required access key
     */
    key: string;
    /**
     * SHA-256 hashed email in hexadecimal
     */
    email?: string;
    /**
     * Email address (provided as cleartext for email verification, direct service communications, and opt-in marketing)
     */
    emailCleartext: string;
    /**
     * Subscription gift key, if provided will be automatically activated upon registration
     */
    giftkey?: string;
    /**
     * Locale used by the user, e.g. 'en' or 'jp
     */
    locale?: CreateUserRequest.locale;
    /**
     * If the user opts in to marketing emails
     */
    allowMarketingEmails: boolean;
    isRecaptchaEnterprise?: boolean;
};
export namespace CreateUserRequest {
    /**
     * Locale used by the user, e.g. 'en' or 'jp
     */
    export enum locale {
        EN = 'en',
        JP = 'jp',
    }
}

