/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoomDndMapTokenResponse } from './RoomDndMapTokenResponse';
/**
 * 返回对象
 */
export type RoomDndMapResponse = {
    /**
     * Room id
     */
    roomId?: number;
    /**
     * 地图图片媒体文件 ID
     */
    mapFileId?: number;
    /**
     * 地图图片媒体类型
     */
    mapMediaType?: string;
    /**
     * Grid rows
     */
    gridRows?: number;
    /**
     * Grid cols
     */
    gridCols?: number;
    /**
     * Grid color
     */
    gridColor?: string;
    /**
     * Map tokens
     */
    tokens?: Array<RoomDndMapTokenResponse>;
    /**
     * Updated at (epoch ms)
     */
    updatedAt?: number;
};

