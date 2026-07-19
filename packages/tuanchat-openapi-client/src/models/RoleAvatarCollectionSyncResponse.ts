/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleAvatar } from './RoleAvatar';
/**
 * 角色头像集合的基线或增量同步响应
 */
export type RoleAvatarCollectionSyncResponse = {
    /**
     * 是否为完整基线；基线只包含当前仍然存在的头像
     */
    baseline?: boolean;
    /**
     * 本集合最新同步 ID
     */
    latestSyncId?: number;
    /**
     * 头像变更；增量中包含非 active 状态的删除记录和 tombstone
     */
    avatars?: Array<RoleAvatar>;
};
