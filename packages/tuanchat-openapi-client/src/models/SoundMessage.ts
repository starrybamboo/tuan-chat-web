/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SoundMessage = {
    /**
     * 大小（字节）
     */
    size: number;
    /**
     * 下载地址
     */
    url: string;
    /**
     * 文件名（带后缀）
     */
    fileName: string;
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

