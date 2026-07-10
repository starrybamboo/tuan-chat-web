/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AvatarCropContext } from './AvatarCropContext';
import type { SpriteCropContext } from './SpriteCropContext';
/**
 * 创建角色头像的请求
 */
export type RoleAvatarCreateRequest = {
    /**
     * 角色id
     */
    roleId?: number;
    /**
     * 头像分类
     */
    category?: string;
    /**
     * 角色立绘组 ID；为空表示不参与合成
     */
    variantId?: number;
    spriteCropContext?: SpriteCropContext;
    avatarCropContext?: AvatarCropContext;
};
