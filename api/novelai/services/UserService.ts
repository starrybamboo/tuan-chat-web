/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountInformationResponse } from '../models/AccountInformationResponse';
import type { BatchDeleteRequest } from '../models/BatchDeleteRequest';
import type { ChangeAccessKeyRequest } from '../models/ChangeAccessKeyRequest';
import type { ChangeMailingListRequest } from '../models/ChangeMailingListRequest';
import type { CreatePersistentTokenInput } from '../models/CreatePersistentTokenInput';
import type { CreatePersistentTokenResponse } from '../models/CreatePersistentTokenResponse';
import type { CreateUserRequest } from '../models/CreateUserRequest';
import type { CreateUserResponse } from '../models/CreateUserResponse';
import type { DeletionFinishRequest } from '../models/DeletionFinishRequest';
import type { DeletionStartRequest } from '../models/DeletionStartRequest';
import type { EmailVerificationRequest } from '../models/EmailVerificationRequest';
import type { EmailVerificationStartRequest } from '../models/EmailVerificationStartRequest';
import type { GetKeystoreResponse } from '../models/GetKeystoreResponse';
import type { GiftKeysResponse } from '../models/GiftKeysResponse';
import type { GoogleSSORequest } from '../models/GoogleSSORequest';
import type { LoginRequest } from '../models/LoginRequest';
import type { ObjectsResponse } from '../models/ObjectsResponse';
import type { OsanoExternalIdResponse } from '../models/OsanoExternalIdResponse';
import type { PriorityResponse } from '../models/PriorityResponse';
import type { RecoveryFinishRequest } from '../models/RecoveryFinishRequest';
import type { RecoveryStartRequest } from '../models/RecoveryStartRequest';
import type { SubscriptionResponse } from '../models/SubscriptionResponse';
import type { SuccessfulLoginResponse } from '../models/SuccessfulLoginResponse';
import type { UpdateKeystoreRequest } from '../models/UpdateKeystoreRequest';
import type { UpsertConsentRequest } from '../models/UpsertConsentRequest';
import type { UserAccountDataResponse } from '../models/UserAccountDataResponse';
import type { UserData } from '../models/UserData';
import type { UserDataInput } from '../models/UserDataInput';
import type { UserSubmissionInput } from '../models/UserSubmissionInput';
import type { UserSubmissionVoteInput } from '../models/UserSubmissionVoteInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class UserService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @param requestBody
     * @returns CreateUserResponse The user has been successfully created.
     * @throws ApiError
     */
    public userControllerCreateUser(
        requestBody: CreateUserRequest,
    ): CancelablePromise<CreateUserResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SuccessfulLoginResponse Login successful.
     * @throws ApiError
     */
    public userControllerLoginUser(
        requestBody: LoginRequest,
    ): CancelablePromise<SuccessfulLoginResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Key is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SuccessfulLoginResponse Access Key change successful.
     * @throws ApiError
     */
    public userControllerChangeAccessKey(
        requestBody: ChangeAccessKeyRequest,
    ): CancelablePromise<SuccessfulLoginResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/change-access-key',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SuccessfulLoginResponse Login successful.
     * @throws ApiError
     */
    public userControllerSsoGoogle(
        requestBody: GoogleSSORequest,
    ): CancelablePromise<SuccessfulLoginResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/sso/google',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any
     * @throws ApiError
     */
    public userControllerChangeMailingListConsent(
        requestBody: ChangeMailingListRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'PATCH',
            url: '/user/change-mailing-list-consent',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Email verification letter has been sent.
     * @throws ApiError
     */
    public userControllerRequestEmailVerification(
        requestBody: EmailVerificationStartRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/resend-email-verification',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any The email has been successfully verified.
     * @throws ApiError
     */
    public userControllerVerifyEmail(
        requestBody: EmailVerificationRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/verify-email',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Verification token was not found.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns AccountInformationResponse Account information
     * @throws ApiError
     */
    public userControllerGetAccountInformation(): CancelablePromise<AccountInformationResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/information',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns OsanoExternalIdResponse Osano External ID for this user.
     * @throws ApiError
     */
    public userControllerGetOsanoExternalId(): CancelablePromise<OsanoExternalIdResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/osano-external-id',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Consent settings have been updated.
     * @throws ApiError
     */
    public userControllerUpsertUserConsent(
        requestBody: UpsertConsentRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/user/consent',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occurred.`,
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Your request has been processed. If the email address provided is registered, it will receive a letter with further instructions.
     * @throws ApiError
     */
    public userControllerRequestAccountDeletion(
        requestBody: DeletionStartRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/deletion/request',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                409: `Cannot delete accounts with active recurring subscriptions.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Account deletion successful.
     * @throws ApiError
     */
    public userControllerDeleteAccount(
        requestBody: DeletionFinishRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/deletion/delete',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Deletion token was not found.`,
                409: `Cannot delete accounts with active recurring subscriptions.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Your request has been processed. If the email address provided is registered, it will receive a letter with further instructions.
     * @throws ApiError
     */
    public userControllerRequestAccountRecovery(
        requestBody: RecoveryStartRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/recovery/request',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns SuccessfulLoginResponse Account recovery successful.
     * @throws ApiError
     */
    public userControllerRecoverAccount(
        requestBody: RecoveryFinishRequest,
    ): CancelablePromise<SuccessfulLoginResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/recovery/recover',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Recovery token was not found.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns any Account deletion successful.
     * @throws ApiError
     */
    public userControllerDeleteAccountUnchecked(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/delete',
            errors: {
                401: `Access Token is incorrect.`,
                409: `Cannot delete accounts with active recurring subscriptions.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns UserAccountDataResponse Various user information.
     * @throws ApiError
     */
    public userControllerGetUserData(): CancelablePromise<UserAccountDataResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/data',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns PriorityResponse Amount of max priority actions left, next max priority action refill (UNIX timestamp) and current task priority.
     * @throws ApiError
     */
    public userControllerGetCurrentPriority(): CancelablePromise<PriorityResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/priority',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns GiftKeysResponse Purchased Gift Keys.
     * @throws ApiError
     */
    public userControllerGetGiftKeys(): CancelablePromise<GiftKeysResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/giftkeys',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns SubscriptionResponse Current subscription, date of expiry and perks.
     * @throws ApiError
     */
    public userControllerGetSubscription(): CancelablePromise<SubscriptionResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/subscription',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns GetKeystoreResponse Keystore buffer in Base64 format.
     * @throws ApiError
     */
    public userControllerGetKeystore(): CancelablePromise<GetKeystoreResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/keystore',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Edit is successful.
     * @throws ApiError
     */
    public userControllerUpdateKeystore(
        requestBody: UpdateKeystoreRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/user/keystore',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param type
     * @param offset
     * @param limit
     * @param order
     * @returns ObjectsResponse List of serverside-stored objects of that type.
     * @throws ApiError
     */
    public userControllerGetObjects(
        type: string,
        offset: number,
        limit: number,
        order: string,
    ): CancelablePromise<ObjectsResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/objects/{type}',
            path: {
                'type': type,
            },
            query: {
                'offset': offset,
                'limit': limit,
                'order': order,
            },
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param type
     * @param requestBody
     * @returns any Object created successfully.
     * @throws ApiError
     */
    public userControllerCreateObject(
        type: string,
        requestBody: UserDataInput,
    ): CancelablePromise<Record<string, any>> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/user/objects/{type}',
            path: {
                'type': type,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                404: `Specified object was not found.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param type
     * @param id
     * @returns UserData Found object.
     * @throws ApiError
     */
    public userControllerGetObject(
        type: string,
        id: string,
    ): CancelablePromise<UserData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/objects/{type}/{id}',
            path: {
                'type': type,
                'id': id,
            },
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param id
     * @param type
     * @param requestBody
     * @returns UserData Object edited successfully.
     * @throws ApiError
     */
    public userControllerEditObject(
        id: string,
        type: string,
        requestBody: UserDataInput,
    ): CancelablePromise<UserData> {
        return this.httpRequest.request({
            method: 'PATCH',
            url: '/user/objects/{type}/{id}',
            path: {
                'id': id,
                'type': type,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                404: `Specified object was not found.`,
                409: `A conflict occured while updating this object.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param id
     * @param type
     * @returns UserData Object deleted successfully.
     * @throws ApiError
     */
    public userControllerDeleteObject(
        id: string,
        type: string,
    ): CancelablePromise<UserData> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/user/objects/{type}/{id}',
            path: {
                'id': id,
                'type': type,
            },
            errors: {
                401: `Access Token is incorrect.`,
                404: `Specified object was not found.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @returns any Client settings in an arbitrary format.
     * @throws ApiError
     */
    public userControllerGetClientSettings(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/clientsettings',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Edit is successful.
     * @throws ApiError
     */
    public userControllerUpdateClientSettings(
        requestBody: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/user/clientsettings',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Specified object types have been successfully deleted.
     * @throws ApiError
     */
    public userControllerBatchDeleteObjects(
        requestBody: BatchDeleteRequest,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/user/objects/batch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns CreatePersistentTokenResponse Token created successfully.
     * @throws ApiError
     */
    public userControllerCreatePersistentToken(
        requestBody: CreatePersistentTokenInput,
    ): CancelablePromise<CreatePersistentTokenResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/create-persistent-token',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param requestBody
     * @returns any Submission is successful.
     * @throws ApiError
     */
    public userControllerPostUserSubmission(
        requestBody: UserSubmissionInput,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/submission',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `A validation error occured.`,
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param event
     * @returns any User submission
     * @throws ApiError
     */
    public userControllerGetUserSubmission(
        event: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/submission/{event}',
            path: {
                'event': event,
            },
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param event
     * @returns any User submission votes
     * @throws ApiError
     */
    public userControllerGetUserSubmissionVotes(
        event: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/user/vote-submission/{event}',
            path: {
                'event': event,
            },
            errors: {
                401: `Access Token is incorrect.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param event
     * @param requestBody
     * @returns any Vote is successful.
     * @throws ApiError
     */
    public userControllerVoteSubmission(
        event: string,
        requestBody: UserSubmissionVoteInput,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/user/vote-submission/{event}',
            path: {
                'event': event,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Access Token is incorrect.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
    /**
     * @param event
     * @param requestBody
     * @returns any Vote is successful.
     * @throws ApiError
     */
    public userControllerRetractSubmissionVote(
        event: string,
        requestBody: UserSubmissionVoteInput,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/user/vote-submission/{event}',
            path: {
                'event': event,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Access Token is incorrect.`,
                409: `A conflict error occured.`,
                500: `An unknown error occured.`,
            },
        });
    }
}
