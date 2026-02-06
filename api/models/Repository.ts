/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 仓库表
 */
export type Repository = {
    /**
     * 仓库ID
     */
    repositoryId?: number;
    /**
     * 所用的规则id
     */
    ruleId?: number;
    /**
     * 仓库名称
     */
    repositoryName?: string;
    /**
     * 仓库的描述
     */
    description?: string;
    /**
     * 上传者
     */
    userId?: number;
    /**
     * 作者
     */
    authorName?: string;
    /**
     * md内容
     */
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
     * 仓库封面
     */
    image?: string;
    /**
     * 仓库可能需要花费的时间，以小时为单位
     */
    maxTime?: number;
    /**
     * 仓库需要人数
     */
    maxPeople?: number;
    /**
     * 从哪个仓库fork来
     */
    parentRepositoryId?: number;
    /**
     * 所属fork网络的根仓库ID(搜索折叠用)
     */
    rootRepositoryId?: number;
    /**
     * 最新提交id
     */
    commitId?: number;
    state?: number;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 修改时间
     */
    updateTime?: string;
};

