/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomRoleAddRequest = {
    /**
     * 房间id
     */
    roomId: number;
    /**
     * 角色id列表
     */
    roleIdList: Array<number>;
    /**
     * 角色类型，0玩家角色，1NPC
     */
    type?: number;
};

