/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 帖子信息响应
 */
export type PostResponse = {
    /**
     * 帖子ID
     */
    communityPostId?: number;
    /**
     * 社区ID
     */
    communityId?: number;
    /**
     * 发布者用户ID
     */
    userId?: number;
    /**
     * 帖子标题
     */
    title?: string;
    /**
     * 帖子内容
     */
    content?: string;
    /**
     * 帖子状态：0-正常，1-删除
     */
    status?: string;
    /**
     * 发布时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

