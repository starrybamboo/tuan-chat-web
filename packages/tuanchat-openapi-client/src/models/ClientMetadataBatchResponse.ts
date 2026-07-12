/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleAvatar } from './RoleAvatar';
import type { UserInfoResponse } from './UserInfoResponse';
import type { UserRole } from './UserRole';
/**
 * 客户端高频元数据批量查询结果
 */
export type ClientMetadataBatchResponse = {
    /**
     * 按角色 ID 索引的角色资料
     */
    roles?: Record<string, UserRole>;
    /**
     * 按用户 ID 索引的用户资料
     */
    users?: Record<string, UserInfoResponse>;
    /**
     * 按头像 ID 索引的头像资料
     */
    avatars?: Record<string, RoleAvatar>;
};

