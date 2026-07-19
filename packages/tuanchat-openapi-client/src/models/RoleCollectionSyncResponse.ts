/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserRole } from './UserRole';
/**
 * 个人角色集合的基线或增量同步响应
 */
export type RoleCollectionSyncResponse = {
    /**
     * 是否为完整基线；基线只包含当前仍然存在的角色
     */
    baseline?: boolean;
    /**
     * 本集合最新同步 ID
     */
    latestSyncId?: number;
    /**
     * 角色变更；增量中包含非 active 状态的删除记录和 tombstone
     */
    roles?: Array<UserRole>;
};
