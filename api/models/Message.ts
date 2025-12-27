/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageExtra } from './MessageExtra';
/**
 * Message
 */
export type Message = {
    /**
     * 全局的ID，全局唯一，用于表示
     */
    messageId: number;
    /**
     * 用于确定用户发送的消息顺序，是万有一失的严格递增，session级别的Id
     */
    syncId: number;
    /**
     * 消息的房间号
     */
    roomId: number;
    /**
     * 用户id
     */
    userId: number;
    /**
     * 角色id
     */
    roleId?: number;
    /**
     * 内容
     */
    content: string;
    /**
     * 说话人的这个时候的立绘
     */
    avatarId?: number;
    /**
     * webgal相关的演出设置
     */
    webgal?: Record<string, any>;
    /**
     * 回复的消息id
     */
    replyMessageId?: number;
    /**
     * 消息状态
     */
    status: number;
    /**
     * 消息类型
     */
    messageType: number;
    /**
     * thread id（用于消息线程聚合）；为空表示主消息流
     */
    threadId?: number;
    /**
     * 位置
     */
    position: number;
    extra?: MessageExtra;
    createTime?: string;
    updateTime?: string;
};

