/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MediaCompleteUploadFailedTarget } from './MediaCompleteUploadFailedTarget';
/**
 * 媒体上传完成声明
 */
export type MediaCompleteUploadRequest = {
    /**
     * 前端确认已可用的媒体质量档
     */
    availableQualities?: Array<string>;
    /**
     * 前端确认待补齐的媒体质量档
     */
    pendingQualities?: Array<string>;
    /**
     * 前端确认上传失败的媒体质量档
     */
    failedQualities?: Array<string>;
    /**
     * 是否存在缺失派生 quality 的降级可用状态
     */
    degraded?: boolean;
    /**
     * 可选的失败 target 摘要
     */
    failedTargets?: Array<MediaCompleteUploadFailedTarget>;
};
