/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BindSubscriptionRequest } from '../models/BindSubscriptionRequest';
import type { ChangeSubscriptionPlanRequest } from '../models/ChangeSubscriptionPlanRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserSubscriptionService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param requestBody
     * @returns any Subscription has been bound properly.
     * @throws ApiError
     */
    public subscriptionControllerBindSubscription(
        requestBody: BindSubscriptionRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/subscription/bind',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                404: `Subscription ID was not found`,
                409: `A conflict occured while binding subscription.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Subscription plan has been changed properly.
     * @throws ApiError
     */
    public subscriptionControllerChangeSubscriptionPlan(
        requestBody: ChangeSubscriptionPlanRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/subscription/change',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                404: `Subscription SKU was not found`,
                409: `A conflict occured while changing subscription plan.`,
                500: `An unknown error occured.`,
            },
        });
    }
}
