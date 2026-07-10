/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MediaSource } from './MediaSource';
export type VideoMessage = {
    source: MediaSource;
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
    second?: number;
};
