/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 分页获取评论请求
 */
export type CommentPageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 评论目标ID
     */
    targetId: number;
    /**
     * 评论目标类型
     */
    targetType: number;
    /**
     * 子评论数量限制
     */
    childLimit?: number;
    /**
     * 最大嵌套层级
     */
    maxLevel?: number;
};

