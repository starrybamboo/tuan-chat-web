/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MessageExtra } from './MessageExtra';
export type Message = {
    messageID: number;
    syncId: number;
    roomId: number;
    userId: number;
    roleId: number;
    content: string;
    avatarId: number;
    animation?: number;
    specialEffects?: number;
    replyMessageId?: number;
    status: number;
    messageType: number;
    extra?: MessageExtra;
    createTime?: string;
    updateTime?: string;
};

