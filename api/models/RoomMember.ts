/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * RoomMember对象
 */
export type RoomMember = {
    /**
     * 房间id
     */
    roomId?: number;
    /**
     * 用户id
     */
    userId?: number;
    /**
     * 成员类型（冗余） 1裁判 2玩家 3观战
     */
    memberType?: number;
    createTime?: string;
    updateTime?: string;
};

