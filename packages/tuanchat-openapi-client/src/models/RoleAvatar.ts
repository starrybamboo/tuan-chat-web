/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpriteTransform } from './SpriteTransform';
export type RoleAvatar = {
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
    spriteTransform?: SpriteTransform;
};

