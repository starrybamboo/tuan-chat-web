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
     * 头像的url
     */
    avatarUrl?: string;
    /**
     * 头像缩略图的url
     */
    avatarThumbUrl?: string;
    /**
     * 立绘的url
     */
    spriteUrl?: string;
    /**
     * 头像裁剪后的原图url（不压缩）
     */
    avatarOriginalUrl?: string;
    /**
     * 立绘裁剪后的原图url（不压缩）
     */
    spriteOriginalUrl?: string;
    /**
     * 用户上传的未裁剪源图url（兼容旧链路）
     */
    originUrl?: string;
    spriteTransform?: SpriteTransform;
};

