/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Room } from './Room';
/**
 * 空间下房间列表复合返回
 */
export type RoomListResponse = {
    /**
     * 空间ID
     */
    spaceId?: number;
    /**
     * 房间列表
     */
    rooms?: Array<Room>;
};

