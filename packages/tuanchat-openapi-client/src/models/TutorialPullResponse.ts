/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 拉取新手教程结果
 */
export type TutorialPullResponse = {
    /**
     * 教程根仓库ID
     */
    tutorialRepositoryId?: number;
    /**
     * 新创建的教程空间ID
     */
    newSpaceId?: number;
    /**
     * 被删除的旧教程空间ID列表
     */
    removedSpaceIds?: Array<number>;
    /**
     * 本次拉取后的教程提交ID
     */
    latestCommitId?: number;
};

