/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Repository 更新请求
 */
export type RepositoryUpdateRequest = {
    /**
     * 仓库id
     */
    repositoryId: number;
    /**
     * 仓库名称
     */
    repositoryName?: string;
    /**
     * 仓库描述
     */
    description?: string;
    /**
     * 作者名字
     */
    authorName?: string;
    readMe?: string;
    /**
     * 可能需要花费的时间，以小时为单位
     */
    minTime?: number;
    /**
     * 需要人数
     */
    minPeople?: number;
    /**
     * 可能需要花费的时间，以小时为单位
     */
    maxTime?: number;
    /**
     * 需要人数
     */
    maxPeople?: number;
    /**
     * 封面
     */
    image?: string;
    /**
     * 状态，0未发布，1已发布
     */
    state?: number;
};

