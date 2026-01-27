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
     * 角色类型（复用 role.type）：0角色，1骰娘，2NPC（兼容旧值：1 曾表示 NPC）
     */
    type?: number;
};

