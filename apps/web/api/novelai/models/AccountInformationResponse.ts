/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AccountInformationResponse = {
    emailVerified: boolean;
    emailVerificationLetterSent: boolean;
    hasPlaintextEmail: boolean;
    plaintextEmail: string | null;
    allowMarketingEmails: boolean;
    trialActivated: boolean;
    trialActionsLeft: number;
    trialImagesLeft: number;
    accountCreatedAt: number;
    banStatus: string;
    banMessage: string;
};

