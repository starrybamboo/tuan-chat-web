/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Room-owned DND map metadata
 */
export type RoomDndMapState = {
    /**
     * Map state schema version
     */
    schemaVersion?: number;
    /**
     * 地图图片媒体文件 ID
     */
    mapFileId?: number;
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
     * Updated at (epoch ms)
     */
    updatedAt?: number;
};

