/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleAvatarVariantCompositionConfig } from './RoleAvatarVariantCompositionConfig';
/**
 * 创建角色立绘组请求
 */
export type RoleAvatarVariantCreateRequest = {
    /**
     * 角色 ID
     */
    roleId?: number;
    /**
     * 立绘组展示名
     */
    name?: string;
    /**
     * 基准立绘头像 ID
     */
    baseAvatarId?: number;
    compositionConfig?: RoleAvatarVariantCompositionConfig;
};

