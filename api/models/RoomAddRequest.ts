/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomAddRequest = {
    /**
     * 所属空间 id
     */
    spaceId: number;
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
    /**
     * 当前房间id，创建房间时，会将新的roomId添加到当前房间Id的临界list中
     */
    roomId?: number;
};

