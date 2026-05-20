/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Message } from './Message';
/**
 * room message-stream 响应
 */
export type RoomMessageStreamResponse = {
    /**
     * 所属空间 ID
     */
    spaceId?: number;
    /**
     * 房间 ID
     */
    roomId?: number;
    /**
     * 当前版本号
     */
    revision?: number;
    /**
     * 是否发生版本冲突
     */
    conflict?: boolean;
    /**
     * 服务端更新时间戳（毫秒）
     */
    updatedAt?: number;
    /**
     * 整份运行态 message-stream
     */
    messages?: Array<Message>;
};

