/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 新手教程上线引导检查结果
 */
export type TutorialBootstrapResponse = {
    /**
     * 是否启用教程引导
     */
    enabled?: boolean;
    /**
     * 教程根仓库ID
     */
    tutorialRepositoryId?: number;
    /**
     * 教程仓库最新提交ID
     */
    latestCommitId?: number;
    /**
     * 当前教程空间ID
     */
    currentSpaceId?: number;
    /**
     * 当前教程空间来源提交ID（space.parentCommitId）
     */
    currentCommitId?: number;
    /**
     * 本次是否自动完成了首克隆
     */
    autoCloned?: boolean;
    /**
     * 自动克隆后创建的新空间ID
     */
    newSpaceId?: number;
    /**
     * 是否缺少教程空间（需要提示用户是否克隆）
     */
    missingTutorial?: boolean;
    /**
     * 教程是否有更新可拉取
     */
    updateAvailable?: boolean;
};

