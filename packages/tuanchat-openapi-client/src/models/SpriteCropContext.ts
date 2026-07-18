/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CropRect } from './CropRect';
/**
 * 立绘裁剪上下文
 */
export type SpriteCropContext = {
    /**
     * 裁剪来源原图媒体文件 ID
     */
    sourceOriginFileId?: number;
    /**
     * 裁剪来源原图宽度
     */
    sourceWidth?: number;
    /**
     * 裁剪来源原图高度
     */
    sourceHeight?: number;
    /**
     * 立绘裁剪矩形
     */
    crop?: CropRect;
    /**
     * 输出立绘宽度
     */
    outputWidth?: number;
    /**
     * 输出立绘高度
     */
    outputHeight?: number;
};
