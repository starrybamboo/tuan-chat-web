/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MoveMessageRequest = {
    /**
     * 消息id
     */
    messageId: number;
    /**
     * 移动到此消息之前
     */
    beforeMessageId?: number;
    /**
     * 移动到此消息之后
     */
    afterMessageId?: number;
};

