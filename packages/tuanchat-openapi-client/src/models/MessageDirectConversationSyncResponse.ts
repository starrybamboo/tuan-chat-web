/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageDirectResponse } from './MessageDirectResponse';
/**
 * 私聊会话同步响应
 */
export type MessageDirectConversationSyncResponse = {
    /**
     * 本次是否返回完整基线
     */
    baseline?: boolean;
    /**
     * 本会话最新 syncId
     */
    latestSyncId?: number;
    /**
     * 消息与状态事件；客户端按 syncId 重放为展示投影
     */
    messages?: Array<MessageDirectResponse>;
};
