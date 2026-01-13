/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserData = {
    /**
     * Object ID
     */
    id: string;
    /**
     * Accompanying non confidential information
     */
    meta: string;
    /**
     * Base64-encoded buffer
     */
    data: string;
    /**
     * UNIX timestamp
     */
    lastUpdatedAt: number;
    /**
     * Incremental revision of the object
     */
    changeIndex: number;
    type: string;
};

