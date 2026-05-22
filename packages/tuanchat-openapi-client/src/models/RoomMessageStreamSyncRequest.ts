/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoomMessageStreamItem } from './RoomMessageStreamItem';
/**
 * 兼容旧接口的整份房间消息列表替换请求；新写入请使用 RoomMessageStreamPatchRequest
 */
export type RoomMessageStreamSyncRequest = {
    /**
     * 兼容旧字段：已废弃，新链路不再维护 revision
     * @deprecated
     */
    baseRevision?: number;
    /**
     * 兼容旧字段：已废弃，新链路不再使用 force/revision 冲突策略
     * @deprecated
     */
    force?: boolean;
    /**
     * 兼容旧接口提交的整份房间消息列表；服务端会转换为统一 patch 并返回 changed messages
     */
    messages: Array<RoomMessageStreamItem>;
};

