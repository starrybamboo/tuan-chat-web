/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 图像变换请求（还没实现！）
 */
export type ImageToImageRequest = {
    /**
     * 原始图片的Base64编码
     */
    imageBase64: string;
    /**
     * 情感差分类型
     */
    emotionType: ImageToImageRequest.emotionType;
};
export namespace ImageToImageRequest {
    /**
     * 情感差分类型
     */
    export enum emotionType {
        _ = '开朗',
        _ = '满足',
        _ = '沉思',
        _ = '悲伤',
        _ = '调皮',
        _ = '哭泣',
        _ = '愤怒',
        _ = '嫉妒',
    }
}

