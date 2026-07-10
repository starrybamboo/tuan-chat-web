/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 动态创建请求
 */
export type MomentFeedRequest = {
    /**
     * 动态文字内容
     */
    content: string;
    /**
     * 上传图片媒体文件 ID
     */
    imageFileIds?: Array<number>;
    /**
     * 相关仓库id
     */
    repositoryId?: number;
};
