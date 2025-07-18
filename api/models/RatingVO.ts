/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 评分响应
 */
export type RatingVO = {
    /**
     * 评分ID
     */
    ratingId?: number;
    /**
     * 评分人用户ID
     */
    userId?: number;
    /**
     * 评分目标ID
     */
    targetId?: number;
    /**
     * 评分目标类型(1:用户,2:评论,3:收藏,4:帖子)
     */
    targetType?: string;
    /**
     * 评分(-2~15)
     */
    score?: string;
    /**
     * 评价内容
     */
    comment?: string;
    /**
     * 消耗的社交点数
     */
    scCost?: number;
    /**
     * 创建时间
     */
    createTime?: string;
};

