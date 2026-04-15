/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 评分请求
 */
export type RatingRequest = {
    /**
     * 评分目标ID
     */
    targetId: number;
    /**
     * 评分目标类型(1:用户,2:评论,3:收藏,4:帖子)
     */
    targetType: string;
    /**
     * 评分(-2~15)
     */
    score: string;
    /**
     * 评价内容
     */
    comment: string;
};

