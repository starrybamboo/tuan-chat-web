/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 好友关系检查响应
 */
export type FriendCheckResponse = {
    /**
     * 是否是好友
     */
    isFriend?: boolean;
    /**
     * 好友状态：1-待确认，2-已接受，3-已拉黑
     */
    status?: number;
    /**
     * 状态描述
     */
    statusDesc?: string;
    /**
     * 是否可以发送消息
     */
    canSendMessage?: boolean;
};

