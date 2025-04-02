/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Message } from './Message';
import type { MessageMark } from './MessageMark';
/**
 * 数据列表
 */
export type ChatMessageResponse = {
    message: Message;
    /**
     * 消息标记
     */
    messageMark?: Array<MessageMark>;
};

