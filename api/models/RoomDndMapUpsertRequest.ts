/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomDndMapUpsertRequest = {
    /**
     * Room id
     */
    roomId: number;
    /**
     * Map image url
     */
    mapImgUrl?: string;
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
     * Clear all tokens after update
     */
    clearTokens?: boolean;
};

