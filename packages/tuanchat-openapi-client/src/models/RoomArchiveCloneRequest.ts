/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 从归档房间克隆新房间
 */
export type RoomArchiveCloneRequest = {
    /**
     * 源归档房间ID
     */
    roomId: number;
    /**
     * 目标空间ID(为空则克隆到原空间)
     */
    targetSpaceId?: number;
};

