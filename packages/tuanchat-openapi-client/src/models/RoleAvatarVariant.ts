/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleAvatarVariantCompositionConfig } from './RoleAvatarVariantCompositionConfig';
/**
 * 角色立绘组
 */
export type RoleAvatarVariant = {
    /**
     * 立绘组 ID
     */
    variantId?: number;
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
    /**
     * WebGAL 合成配置
     */
    compositionConfig?: RoleAvatarVariantCompositionConfig;
    createTime?: string;
    updateTime?: string;
};
