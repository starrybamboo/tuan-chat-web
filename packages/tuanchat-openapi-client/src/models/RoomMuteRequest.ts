/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomMuteRequest = {
    /**
     * 房间 id
     */
    roomId: number;
    /**
     * 禁言状态 0未禁言 1全员禁言(裁判除外)
     */
    muteStatus?: number;
};

