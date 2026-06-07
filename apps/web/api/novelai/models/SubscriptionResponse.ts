/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SubscriptionAvailableTrainingSteps } from './SubscriptionAvailableTrainingSteps';
import type { SubscriptionTierPerks } from './SubscriptionTierPerks';
export type SubscriptionResponse = {
    /**
     * Subscription internal tier number, see SubscriptionTiers enum
     */
    tier: number;
    /**
     * Is subscription active as of the moment of the request
     */
    active: boolean;
    /**
     * UNIX timestamp of subscription expiration
     */
    expiresAt: number;
    /**
     * Subscription perks
     */
    perks: SubscriptionTierPerks;
    /**
     * Payment processor arbitrary data
     */
    paymentProcessorData: Record<string, any>;
    /**
     * Amount of available module training steps left
     */
    trainingStepsLeft: SubscriptionAvailableTrainingSteps;
    /**
     * Whether the user subscription is in grace period
     */
    isGracePeriod: boolean;
};

