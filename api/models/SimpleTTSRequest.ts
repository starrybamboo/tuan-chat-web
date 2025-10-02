/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 鸣潮语音合成API简化请求参数
 */
export type SimpleTTSRequest = {
    /**
     * 访问令牌
     */
    accessToken: string;
    /**
     * 模型名称
     */
    modelName: string;
    /**
     * 说话人名称
     */
    speakerName: string;
    /**
     * 情感类型
     */
    emotion?: string;
    /**
     * 待合成的文本内容
     */
    text: string;
};

