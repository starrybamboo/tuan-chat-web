/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 媒体上传目标
 */
export type MediaUploadTarget = {
    /**
     * 目标质量档：original、low、medium、high
     */
    quality?: string;
    /**
     * 临时 object key
     */
    objectKey?: string;
    /**
     * 预签名 PUT URL
     */
    uploadUrl?: string;
    /**
     * PUT 时必须携带的请求头
     */
    uploadHeaders?: Record<string, string>;
};

