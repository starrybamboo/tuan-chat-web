/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AvatarCropContext } from './AvatarCropContext';
import type { SpriteCropContext } from './SpriteCropContext';
import type { SpriteTransform } from './SpriteTransform';
export type RoleAvatarRequest = {
    /**
     * 角色id
     */
    roleId?: number;
    /**
     * 角色id
     */
    avatarId?: number;
    /**
     * 头像的标题
     */
    avatarTitle?: Record<string, string>;
    /**
     * 头像分类
     */
    category?: string;
    /**
     * 角色立绘组 ID；为空表示不参与合成
     */
    variantId?: number;
    /**
     * 头像媒体文件 ID
     */
    avatarFileId?: number;
    /**
     * 立绘媒体文件 ID
     */
    spriteFileId?: number;
    /**
     * 用户上传源图媒体文件 ID
     */
    originFileId?: number;
    spriteCropContext?: SpriteCropContext;
    spriteTransform?: SpriteTransform;
    avatarCropContext?: AvatarCropContext;
};
