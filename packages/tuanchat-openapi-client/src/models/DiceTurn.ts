/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DiceTurnReply } from './DiceTurnReply';
export type DiceTurn = {
    /**
     * 命令文本；兼容旧消息时可为空
     */
    command?: string;
    /**
     * 骰娘回复列表
     */
    replies: Array<DiceTurnReply>;
};

