/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 点赞记录表
 */
export type LikeRecord = {
    /**
     * 主键ID
     */
    id?: number;
    /**
     * 用户ID
     */
    userId?: number;
    /**
     * 目标内容ID
     */
    targetId?: number;
    /**
     * 目标类型(1-feed, 2-post, 3-repository等)
     */
    targetType?: string;
    /**
     * 创建时间
     */
    createTime?: string;
};

