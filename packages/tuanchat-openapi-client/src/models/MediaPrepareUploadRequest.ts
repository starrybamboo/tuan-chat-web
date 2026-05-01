/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 媒体单例上传准备请求
 */
export type MediaPrepareUploadRequest = {
    /**
     * 原始文件名，仅用于审计和错误提示
     */
    fileName?: string;
    /**
     * 业务上传场景，可复用旧 OSS scene
     */
    scene?: number;
    /**
     * canonical source 的 SHA-256
     */
    sha256: string;
    /**
     * canonical source 的字节数
     */
    sizeBytes: number;
    /**
     * canonical source 的 MIME 类型
     */
    mimeType?: string;
    /**
     * 前端识别到的 MIME 类型；为空时后端按文件名后缀兜底推断
     */
    contentType?: string;
    /**
     * 是否检测到 NovelAI 元数据
     */
    hasNovelAiMetadata?: boolean;
    /**
     * 客户端解析出的媒体元数据，例如 width/height/durationMs
     */
    metadata?: Record<string, Record<string, any>>;
};

