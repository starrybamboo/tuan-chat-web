/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MediaUploadTarget } from './MediaUploadTarget';
/**
 * 媒体单例上传准备响应
 */
export type MediaPrepareUploadResponse = {
    /**
     * 是否需要上传；去重命中 ready 文件时为 false
     */
    uploadRequired?: boolean;
    /**
     * 媒体文件 ID
     */
    fileId?: number;
    /**
     * 媒体类型：image、audio、video、document、other
     */
    mediaType?: string;
    /**
     * 文件状态
     */
    status?: string;
    /**
     * 上传会话 ID；uploadRequired=true 时返回
     */
    sessionId?: number;
    /**
     * 各质量档上传目标；uploadRequired=true 时返回
     */
    uploadTargets?: Record<string, MediaUploadTarget>;
};

