/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserRole } from './UserRole';
/**
 * 房间角色聚合列表
 */
export type RoomRoleListResponse = {
    /**
     * 房间内全部有效角色
     */
    allRoles?: Array<UserRole>;
    /**
     * 房间内普通角色与骰娘
     */
    baseRoles?: Array<UserRole>;
    /**
     * 房间内 NPC
     */
    npcRoles?: Array<UserRole>;
};
