/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MediaSource } from './MediaSource';
export type ImageMessage = {
    source: MediaSource;
    /**
     * 兼容旧版扁平媒体文件 ID，读取后会转换为 source
     * @deprecated
     */
    fileId?: number;
    /**
     * 大小（字节）
     */
    size?: number;
    /**
     * 文件名（带后缀）
     */
    fileName?: string;
    /**
     * 是否渲染为背景
     */
    background: boolean;
    /**
     * 宽度（像素）
     */
    width: number;
    /**
     * 高度（像素）
     */
    height: number;
};

