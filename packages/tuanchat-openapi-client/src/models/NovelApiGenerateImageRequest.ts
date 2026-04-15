/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * NovelAI 生图代理请求
 */
export type NovelApiGenerateImageRequest = {
    /**
     * 输入提示词
     */
    input: string;
    /**
     * NovelAI 模型名
     */
    model: string;
    /**
     * 动作类型（generate/img2img）
     */
    action?: string;
    /**
     * 生图参数对象（透传到 NovelAI）
     */
    parameters: Record<string, Record<string, any>>;
    /**
     * 可选自定义 URL（为安全起见，服务端不会信任该字段）
     */
    url?: string;
};

