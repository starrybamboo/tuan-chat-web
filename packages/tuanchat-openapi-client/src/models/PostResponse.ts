/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatMessageResponse } from './ChatMessageResponse';
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
     * 封面图片URL
     */
    coverImage?: string;
    message?: ChatMessageResponse;
    /**
     * 发布时间
     */
    createTime?: string;
};

