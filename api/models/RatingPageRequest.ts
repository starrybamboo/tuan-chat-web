/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 评分分页请求
 */
export type RatingPageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 评分目标ID
     */
    targetId: number;
    /**
     * 评分目标类型(1:用户,2:评论,3:收藏,4:帖子)
     */
    targetType: string;
};

