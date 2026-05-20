/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoomMessageStreamItem } from './RoomMessageStreamItem';
/**
 * room message-stream 批量同步请求
 */
export type RoomMessageStreamSyncRequest = {
    /**
     * 客户端同步基线版本；为空按 0 处理
     */
    baseRevision?: number;
    /**
     * 是否强制覆盖云端版本
     */
    force?: boolean;
    /**
     * 整份 room message-stream
     */
    messages: Array<RoomMessageStreamItem>;
};

