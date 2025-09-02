/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetaData } from './MetaData';
/**
 * feed
 */
export type Feed = {
    /**
     * Feed唯一ID
     */
    feedId?: number;
    /**
     * 发布者用户ID
     */
    fromUserId?: number;
    /**
     * 接收者用户ID
     */
    toUserId?: number;
    /**
     * Feed状态，1.正常 0.已删除
     */
    status?: string;
    /**
     * 0.首页feed 1.ThumbsUpEvent  2.CommentEvent 3. CollectEvent
     */
    type?: number;
    meta?: MetaData;
    /**
     * 同一feed来源的唯一表示符
     */
    token?: number;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

