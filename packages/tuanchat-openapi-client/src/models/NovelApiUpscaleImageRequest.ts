/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * NovelAI 图片放大代理请求
 */
export type NovelApiUpscaleImageRequest = {
    /**
     * Base64 图片数据
     */
    image: string;
    /**
     * 输入图片宽度
     */
    width: number;
    /**
     * 输入图片高度
     */
    height: number;
    /**
     * 放大倍数，仅支持 2 或 4
     */
    scale: number;
};

