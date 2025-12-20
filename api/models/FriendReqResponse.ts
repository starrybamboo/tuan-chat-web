/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserInfo } from './UserInfo';
/**
 * 好友请求响应
 */
export type FriendReqResponse = {
    /**
     * 好友请求ID
     */
    id?: number;
    /**
     * 发起用户ID
     */
    fromId?: number;
    fromUser?: UserInfo;
    /**
     * 目标用户ID
     */
    toId?: number;
    toUser?: UserInfo;
    /**
     * 请求状态
     */
    status?: number;
    /**
     * 请求状态描述
     */
    statusDesc?: string;
    /**
     * 验证信息
     */
    verifyMsg?: string;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 请求类型：sent-发送的，received-接收的
     */
    type?: string;
};

