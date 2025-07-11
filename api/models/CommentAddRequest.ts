/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 添加评论请求
 */
export type CommentAddRequest = {
    /**
     * 根评论ID，如果是一级评论，则为0
     */
    rootCommentId?: number;
    /**
     * 父评论ID，如果是一级评论，则为0
     */
    parentCommentId?: number;
    /**
     * 评论目标ID
     */
    targetId: number;
    /**
     * 评论目标类型
     */
    targetType: number;
    /**
     * 评论内容
     */
    content: string;
};

