/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoomMessageMutationMeta } from './RoomMessageMutationMeta';
import type { RoomMessageStreamPatchOperation } from './RoomMessageStreamPatchOperation';
/**
 * 房间消息批量变更请求
 */
export type RoomMessageStreamPatchRequest = {
    /**
     * 房间 ID
     */
    roomId: number;
    /**
     * 消息级变更操作列表
     */
    operations: Array<RoomMessageStreamPatchOperation>;
    /**
     * 消息变更来源元数据
     */
    mutationMeta: RoomMessageMutationMeta;
};
