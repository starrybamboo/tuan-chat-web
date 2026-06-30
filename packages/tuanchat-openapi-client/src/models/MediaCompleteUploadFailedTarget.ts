/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 媒体上传失败 target 摘要
 */
export type MediaCompleteUploadFailedTarget = {
    /**
     * 失败 target 的 quality
     */
    quality?: string;
    /**
     * 失败原因摘要
     */
    error?: string;
    /**
     * 该失败是否适合用户再次重试
     */
    retryable?: boolean;
};
