/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 准备态消息；尚未进入具体房间现场的可发送消息内容
 */
export type MessageDraft = {
    /**
     * 消息类型
     */
    messageType?: number;
    /**
     * 消息内容
     */
    content?: string;
    /**
     * 消息 annotations，技术上即消息自身注解
     */
    annotations?: Array<string>;
    /**
     * 消息 extra
     */
    extra?: Record<string, any>;
    /**
     * 消息 webgal 配置
     */
    webgal?: Record<string, any>;
};

