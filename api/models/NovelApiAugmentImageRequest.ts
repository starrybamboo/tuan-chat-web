/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * NovelAI 导演工具代理请求
 */
export type NovelApiAugmentImageRequest = {
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
     * 导演工具类型
     */
    req_type: string;
    /**
     * 是否启用 NovelAI 新共享试用逻辑
     */
    use_new_shared_trial?: boolean;
    /**
     * 可选的 recaptcha token
     */
    recaptcha_token?: string;
};

