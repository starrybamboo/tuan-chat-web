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
        CHEERFUL = 'cheerful',
        SATISFIED = 'satisfied',
        THOUGHTFUL = 'thoughtful',
        SAD = 'sad',
        PLAYFUL = 'playful',
        CRYING = 'crying',
        ANGRY = 'angry',
        JEALOUS = 'jealous',
    }
}

