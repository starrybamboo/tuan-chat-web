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
     * 仓库封面媒体文件 ID；替代 image/originalImage
     */
    coverFileId?: number;
    /**
     * Original cover image
     */
    originalImage?: string;
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

