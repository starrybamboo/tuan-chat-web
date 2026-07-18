/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageExtra } from './MessageExtra';
export type ChatMessageRequest = {
    /**
     * 房间id
     */
    roomId: number;
    /**
     * 消息类型
     */
    messageType: number;
    /**
     * 发送者扮演的角色的id
     */
    roleId?: number;
    /**
     * 发送者扮演的角色的立绘id
     */
    avatarId?: number;
    /**
     * 消息内容
     */
    content?: string;
    /**
     * 消息标注
     */
    annotations?: Array<string>;
    /**
     * 自定义角色名（为空则使用角色名）
     */
    customRoleName?: string;
    /**
     * 回复的消息id,如果没有别传就好
     */
    replayMessageId?: number;
    /**
     * webgal相关的演出设置
     */
    webgal?: any;
    /**
     * 消息位置（可选，用于插入消息排序）
     */
    position?: number;
    /**
     * 消息内容，类型不同传值不同.
     */
    extra: MessageExtra;
};
