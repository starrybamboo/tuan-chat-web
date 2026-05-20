/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageExtra } from './MessageExtra';
/**
 * room message-stream 中的单条消息输入
 */
export type RoomMessageStreamItem = {
    /**
     * 消息类型
     */
    messageType?: number;
    /**
     * 消息内容
     */
    content?: string;
    /**
     * 消息 annotations
     */
    annotations?: Array<string>;
    extra?: MessageExtra;
    /**
     * WebGAL 配置
     */
    webgal?: Record<string, any>;
    /**
     * 角色 ID
     */
    roleId?: number;
    /**
     * 头像 ID
     */
    avatarId?: number;
    /**
     * 自定义角色名
     */
    customRoleName?: string;
};

