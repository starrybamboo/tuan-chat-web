/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoomMessageStreamItem } from './RoomMessageStreamItem';
/**
 * 房间消息单个变更操作
 */
export type RoomMessageStreamPatchOperation = {
    /**
     * 操作类型：insert/update/delete/move
     */
    op?: string;
    /**
     * 客户端操作 ID，用于前端乐观消息对账
     */
    clientId?: string;
    /**
     * 目标消息 ID；update/delete/move 必填
     */
    messageId?: number;
    /**
     * 目标位置；move 必填，insert/update 可随 message.position 提交
     */
    position?: number;
    message?: RoomMessageStreamItem;
    insert?: boolean;
};

