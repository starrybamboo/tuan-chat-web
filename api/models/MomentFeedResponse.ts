/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModuleVo } from './ModuleVo';
/**
 * 用户动态Feed响应
 */
export type MomentFeedResponse = {
    /**
     * Feed ID
     */
    feedId?: number;
    /**
     * 发布者用户ID
     */
    userId?: number;
    /**
     * 动态文字内容
     */
    content?: string;
    /**
     * 上传图片url
     */
    imageUrls?: Array<string>;
    /**
     * feed token
     */
    token?: number;
    moduleVO?: ModuleVo;
    /**
     * 创建时间
     */
    createTime?: string;
};

