/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 分页获取父评论子树请求
 */
export type CommentChildPageRequest = {
    /**
     * 页码
     */
    pageNo?: number;
    /**
     * 新加载子评论的每页数量，最大20条
     */
    pageSize?: number;
    /**
     * 评论目标ID
     */
    targetId: number;
    /**
     * 评论目标类型
     */
    targetType: string;
    /**
     * 父评论ID
     */
    parentCommentId: number;
    /**
     * 每个新加载子评论继续向下预取的直接子评论数量限制
     */
    childLimit?: number;
    /**
     * 新加载子树的最大嵌套层级
     */
    maxLevel?: number;
};

