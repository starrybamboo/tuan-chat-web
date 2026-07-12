/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CropRect } from './CropRect';
/**
 * 头像裁剪上下文
 */
export type AvatarCropContext = {
    /**
     * 裁剪来源立绘媒体文件 ID
     */
    sourceSpriteFileId?: number;
    /**
     * 裁剪来源画布宽度
     */
    sourceWidth?: number;
    /**
     * 裁剪来源画布高度
     */
    sourceHeight?: number;
    /**
     * 头像裁剪矩形
     */
    crop?: CropRect;
};

