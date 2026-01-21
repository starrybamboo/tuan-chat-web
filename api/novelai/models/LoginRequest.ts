/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LoginRequest = {
    /**
     * Required access key
     */
    key: string;
    /**
     * ReCAPTCHA response token for the novelai.net domain. This is optional at this moment(but we will make it mandatory)
     */
    recaptcha?: string;
};

