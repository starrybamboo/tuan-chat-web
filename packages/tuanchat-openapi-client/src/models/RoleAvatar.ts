/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AvatarCropContext } from './AvatarCropContext';
import type { RoleAvatarVariant } from './RoleAvatarVariant';
import type { SpriteCropContext } from './SpriteCropContext';
import type { SpriteTransform } from './SpriteTransform';
/**
 * 角色头像差分
 */
export type RoleAvatar = {
    /**
     * 角色id
     */
    roleId: number;
    /**
     * 头像id
     */
    avatarId: number;
    /**
     * 角色头像集合变更同步 ID
     */
    syncId?: number;
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
     * 角色立绘组快照
     */
    variantGroup?: RoleAvatarVariant;
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
    /**
     * 立绘裁剪上下文（原图生成立绘）
     */
    spriteCropContext?: SpriteCropContext;
    /**
     * 头像媒体类型
     */
    avatarMediaType?: string;
    /**
     * 立绘媒体类型
     */
    spriteMediaType?: string;
    /**
     * 用户上传源图媒体类型
     */
    originMediaType?: string;
    createTime?: string;
    updateTime?: string;
    /**
     * 头像状态,0正常,1回收站,2同步墓碑
     */
    state?: number;
    /**
     * 立绘变换参数（WebGAL）
     */
    spriteTransform?: SpriteTransform;
    /**
     * 头像裁剪上下文（WebGAL 合成立绘）
     */
    avatarCropContext?: AvatarCropContext;
    /**
     * 继承来源的归档头像ID
     */
    inheritedArchiveAvatarId?: number;
    /**
     * 版本状态
     */
    versionState?: number;
};
