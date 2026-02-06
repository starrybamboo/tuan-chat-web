/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChatMessageRequest = {
    /**
     * 房间id
     */
    roomId: number;
    /**
     * thread id（用于消息线程聚合）；为空表示主消息流，非空表示属于该 thread
     */
    threadId?: number;
    /**
     * 消息类型
     */
    messageType: number;
    /**
     * 发送者扮演的角色的id
     */
    roleId?: number;
    /**
     * 发送者扮演的角色的立绘id
     */
    avatarId?: number;
    /**
     * 消息内容
     */
    content?: string;
    /**
     * 消息标注
     */
    annotations?: Array<string>;
    /**
     * 自定义角色名（为空则使用角色名）
     */
    customRoleName?: string;
    /**
     * 回复的消息id,如果没有别传就好
     */
    replayMessageId?: number;
    /**
     * webgal相关的演出设置
     */
    webgal?: Record<string, any>;
    /**
     * 消息内容，类型不同传值不同.
     */
    extra: Record<string, any>;
};

