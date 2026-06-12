/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RecoveryFinishRequest = {
    /**
     * Recovery token provided in the email letter
     */
    recoveryToken: string;
    /**
     * New access key
     */
    newAccessKey: string;
    /**
     * Should the server reset keystore and remove objects of stories and storycontent type?
     */
    deleteContent: boolean;
};

