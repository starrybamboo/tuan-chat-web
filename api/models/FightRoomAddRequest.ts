/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FightRoomAddRequest = {
    /**
     * 父房间id
     */
    parentRoomId: number;
    /**
     * 邀请的uid列表
     */
    userIdList?: Array<number>;
    /**
     * 房间名称
     */
    roomName?: string;
    /**
     * 房间头像
     */
    avatar?: string;
};

