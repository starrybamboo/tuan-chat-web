/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 帖子统计信息响应
 */
export type PostStatsResponse = {
    /**
     * 帖子ID
     */
    postId?: number;
    /**
     * 点赞数量
     */
    likeCount?: number;
    /**
     * 评论数量
     */
    commentCount?: number;
    /**
     * 收藏数量
     */
    collectionCount?: number;
    /**
     * 当前用户是否已点赞
     */
    isLiked?: boolean;
    /**
     * 当前用户是否已收藏
     */
    isCollected?: boolean;
};

