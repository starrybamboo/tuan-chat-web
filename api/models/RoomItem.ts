/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * RoomItem对象，因为一个实体可能存在于多个房间，所以需要中间表映射
 */
export type RoomItem = {
    /**
     * 房间ID
     */
    roomId: number;
    /**
     * 暂存区实体ID
     */
    stageEntityId: number;
};

