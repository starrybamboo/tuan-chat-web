/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MediaSource } from './MediaSource';
export type SoundMessage = {
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
     * 时长（秒）
     */
    second: number;
    /**
     * 用途（如：bgm）
     */
    purpose?: string;
    /**
     * 音量（0-100）
     */
    volume?: number;
};

