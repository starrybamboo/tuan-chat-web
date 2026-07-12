/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleAvatarVariantCompositionConfig } from './RoleAvatarVariantCompositionConfig';
/**
 * 更新角色立绘组请求
 */
export type RoleAvatarVariantUpdateRequest = {
    /**
     * 立绘组 ID
     */
    variantId?: number;
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
};

