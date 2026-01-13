/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BindSubscriptionRequest = {
    /**
     * Subscription payment processor
     */
    paymentProcessor: BindSubscriptionRequest.paymentProcessor;
    /**
     * Payment processor ID
     */
    subscriptionId: string;
    /**
     * Whether the user confirmed replacing the subscription
     */
    confirmedReplace?: Record<string, any>;
    /**
     * Whether the user confirmed ignoring the subscription
     */
    confirmedIgnore?: Record<string, any>;
};
export namespace BindSubscriptionRequest {
    /**
     * Subscription payment processor
     */
    export enum paymentProcessor {
        GIFTKEY = 'giftkey',
        TRIAL = 'trial',
    }
}

