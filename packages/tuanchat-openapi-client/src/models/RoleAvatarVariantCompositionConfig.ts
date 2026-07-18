/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AvatarSlot } from './AvatarSlot';
import type { Canvas } from './Canvas';
import type { Output } from './Output';
import type { SpriteCrop } from './SpriteCrop';
import type { SpriteTransform } from './SpriteTransform';
/**
 * 角色立绘组合成配置
 */
export type RoleAvatarVariantCompositionConfig = {
    /**
     * 合成模式
     */
    mode?: string;
    /**
     * 合成画布
     */
    canvas?: Canvas;
    /**
     * 头像覆盖槽位
     */
    avatarSlot?: AvatarSlot;
    /**
     * 原图生成立绘的裁剪配置
     */
    spriteCrop?: SpriteCrop;
    /**
     * WebGAL 立绘变换参数
     */
    spriteTransform?: SpriteTransform;
    /**
     * 输出设置
     */
    output?: Output;
    complete?: boolean;
};
