/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserInfoResponse } from './UserInfoResponse';
/**
 * 评论视图对象
 */
export type CommentVO = {
    /**
     * 评论ID
     */
    commentId?: number;
    /**
     * 根评论ID
     */
    rootCommentId?: number;
    /**
     * 父评论ID
     */
    parentCommentId?: number;
    /**
     * 用户ID
     */
    userId?: number;
    userInfo?: UserInfoResponse;
    /**
     * 评论内容
     */
    content?: string;
    /**
     * 评论状态：1-正常，0-已删除，2-已屏蔽
     */
    status?: string;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 子评论列表
     */
    children?: Array<CommentVO>;
    /**
     * 是否还有更多子评论
     */
    hasMore?: boolean;
    /**
     * 总子评论数量
     */
    totalChildren?: number;
};

