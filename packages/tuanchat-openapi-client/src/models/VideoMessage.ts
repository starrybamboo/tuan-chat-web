/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VideoMessage = {
    /**
     * 媒体文件 ID
     */
    fileId: number;
    /**
     * 媒体类型：image/audio/video/document/other
     */
    mediaType: string;
    /**
     * 大小（字节）
     */
    size: number;
    /**
     * 文件名（带后缀）
     */
    fileName: string;
    /**
     * 时长（秒）
     */
    second?: number;
};

