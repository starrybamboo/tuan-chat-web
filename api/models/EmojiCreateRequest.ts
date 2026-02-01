/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EmojiCreateRequest = {
    /**
     * 表情包名称
     */
    name: string;
    /**
     * ͼƬURL
     */
    imageUrl: string;
    /**
     * 文件大小(bytes)
     */
    fileSize: number;
    /**
     * 图片宽度
     */
    width?: number;
    /**
     * 图片高度
     */
    height?: number;
    /**
     * 图片格式
     */
    format: string;
};

