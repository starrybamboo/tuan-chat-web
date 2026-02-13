/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 仓库更新请求
 */
export type RepositoryUpdateRequest = {
    /**
     * 仓库ID
     */
    repositoryId: number;
    /**
     * 仓库名称
     */
    repositoryName?: string;
    /**
     * 仓库的描述
     */
    description?: string;
    /**
     * 仓库作者名字
     */
    authorName?: string;
    readMe?: string;
    /**
     * 仓库可能需要花费的时间，以小时为单位
     */
    minTime?: number;
    /**
     * 仓库需要人数
     */
    minPeople?: number;
    /**
     * 仓库可能需要花费的时间，以小时为单位
     */
    maxTime?: number;
    /**
     * 仓库需要人数
     */
    maxPeople?: number;
    /**
     * 仓库封面
     */
    image?: string;
    /**
     * 仓库状态，0未发布，1已发布
     */
    state?: number;
};

