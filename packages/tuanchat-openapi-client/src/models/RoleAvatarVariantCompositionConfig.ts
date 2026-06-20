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
    canvas?: Canvas;
    avatarSlot?: AvatarSlot;
    spriteCrop?: SpriteCrop;
    spriteTransform?: SpriteTransform;
    output?: Output;
    complete?: boolean;
};

