/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountInformationResponse } from './AccountInformationResponse';
import type { GetKeystoreResponse } from './GetKeystoreResponse';
import type { PriorityResponse } from './PriorityResponse';
import type { SubscriptionResponse } from './SubscriptionResponse';
export type UserAccountDataResponse = {
    priority: PriorityResponse;
    subscription: SubscriptionResponse;
    keystore: GetKeystoreResponse;
    settings: string | null;
    information: AccountInformationResponse;
};

