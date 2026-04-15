/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 素材中的单条消息定义
 */
export type MaterialMessageItem = {
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
    extra?: Record<string, Record<string, any>>;
    /**
     * 消息 webgal 配置
     */
    webgal?: Record<string, Record<string, any>>;
    /**
     * 角色 ID
     */
    roleId?: number;
    /**
     * 头像 ID
     */
    avatarId?: number;
    /**
     * 自定义角色名
     */
    customRoleName?: string;
};

