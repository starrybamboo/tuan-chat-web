/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * NovelAI 控制图代理请求
 */
export type NovelApiAnnotateImageRequest = {
    /**
     * NovelAI 控制图模型
     */
    model: string;
    /**
     * 控制图参数对象（透传到 NovelAI）
     */
    parameters: Record<string, Record<string, any>>;
};

