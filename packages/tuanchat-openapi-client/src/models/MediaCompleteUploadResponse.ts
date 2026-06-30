/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 媒体上传完成响应
 */
export type MediaCompleteUploadResponse = {
    /**
     * 媒体文件 ID
     */
    fileId?: number;
    /**
     * 媒体类型
     */
    mediaType?: string;
    /**
     * 文件状态
     */
    status?: string;
    /**
     * 已可用的媒体质量档
     */
    availableQualities?: Array<string>;
    /**
     * 待补齐的媒体质量档
     */
    pendingQualities?: Array<string>;
    /**
     * 上传失败的媒体质量档
     */
    failedQualities?: Array<string>;
    /**
     * 是否为降级可用状态
     */
    degraded?: boolean;
};

