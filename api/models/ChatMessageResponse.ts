/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Message } from './Message';
import type { MessageMark } from './MessageMark';
/**
 * 转发的消息列表，json写死的，不会随着原来的消息而改变
 */
export type ChatMessageResponse = {
    message: Message;
    /**
     * 消息标记
     */
    messageMark?: Array<MessageMark>;
};

