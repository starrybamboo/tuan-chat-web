/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageExtra } from './MessageExtra';
/**
 * 房间消息 patch 中的单条消息输入
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
    /**
     * 消息 extra
     */
    extra?: MessageExtra;
    /**
     * WebGAL 配置
     */
    webgal?: any;
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
    /**
     * 回复的消息id
     */
    replayMessageId?: number;
    /**
     * 消息位置
     */
    position?: number;
};

