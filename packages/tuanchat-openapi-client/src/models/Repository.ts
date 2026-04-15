/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Repository entity
 */
export type Repository = {
    /**
     * Repository id
     */
    repositoryId?: number;
    /**
     * Rule id
     */
    ruleId?: number;
    /**
     * Repository name
     */
    repositoryName?: string;
    /**
     * Description
     */
    description?: string;
    /**
     * Owner id
     */
    userId?: number;
    /**
     * Author name
     */
    authorName?: string;
    /**
     * Readme content
     */
    readMe?: string;
    /**
     * Min play time (hours)
     */
    minTime?: number;
    /**
     * Min people
     */
    minPeople?: number;
    /**
     * Cover image
     */
    image?: string;
    /**
     * Max play time (hours)
     */
    maxTime?: number;
    /**
     * Max people
     */
    maxPeople?: number;
    /**
     * Parent repository id
     */
    parentRepositoryId?: number;
    /**
     * Root repository id
     */
    rootRepositoryId?: number;
    /**
     * Head commit id
     */
    commitId?: number;
    state?: number;
    /**
     * Create time
     */
    createTime?: string;
    /**
     * Update time
     */
    updateTime?: string;
};

