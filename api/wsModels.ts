/**
 * ws相关消息的接口定义
 */
// websocket-types.ts

import type { UserNotificationItem } from "@/components/notification/notificationTypes";

/**
 * 消息类型枚举
 */
export enum MessageType {
    TEXT = 1,
    IMG = 2,
    FILE = 3,
    SYSTEM = 4,
    FORWARD = 5,
    DICE = 6,
    SOUND = 7,
    EFFECT = 8,
    /** 跑团：检定/指令请求消息（点击后由他人“一键发送”执行） */
    COMMAND_REQUEST = 12,
    /** WebGAL 选择消息（结构化选项） */
    WEBGAL_CHOOSE = 13,
    VIDEO = 14,
    STATE_EVENT = 15,
    CLUE_CARD = 1000,
    ROOM_JUMP = 1003,
    THREAD_ROOT = 10001,
}

/**
 * WebSocket消息基础接口
 */
interface BaseMessage<T> {
    type: number;
    data: T;
}

/**
 * 服务端推送消息类型
 */

// 成员变动 (type: 11)
export interface MemberChangePush extends BaseMessage<{
    spaceId?: number;
    roomId?: number;
    userIds: number[];
    changeType: 1 | 2 | 3;
    activeStatus?: number;
    lastOptTime?: string;
}> {
    type: 11;
}

// 角色变动 (type: 12)
export interface RoleChangePush extends BaseMessage<{
    spaceId?: number;
    roleIds: number[];
    roomId?: number;
    changeType: 1 | 2;
}> {
    type: 12;
}

// 房间解散 (type: 14)
export interface RoomDismissPush extends BaseMessage<{
    roomId: number;
}> {
    type: 14;
}

// 空间频道树变更 (type: 22)
export interface SpaceSidebarTreeUpdatedPush extends BaseMessage<{
    spaceId: number;
    version: number;
    updatedBy?: number;
}> {
    type: 22;
}

// 用户通知 (type: 23)
export interface UserNotificationPush extends BaseMessage<UserNotificationItem> {
    type: 23;
}

// 新的好友申请 (type: 21)
export interface NewFriendRequestPush extends BaseMessage<{
    friendReqId: number;
    targetUserId: number;
    verifyMsg: string;
}> {
    type: 21;
}

// 好友申请已接受 (type: 24)
export interface FriendRequestAcceptedPush extends BaseMessage<{
    friendReqId: number;
    requesterUserId: number;
    accepterUserId: number;
}> {
    type: 24;
}

/**
 * ===============服务端推送消息 (Server-to-Client)   这些是服务器主动推送给客户端的消息结构。
 */


/**
 * 服务端推送的私聊消息事件。
 * Corresponds to message type 1.
 */
export interface DirectMessageEvent {
    messageId: number;      // 消息的唯一ID
    senderId: number;       // 发送者ID
    senderUsername?: string; // 发送者用户名
    senderAvatar?: string; // 发送者头像 URL
    senderAvatarThumbUrl?: string; // 发送者头像缩略图 URL
    receiverId: number;     // 接收者ID
    receiverUsername?: string; // 接收者用户名
    receiverAvatar?: string; // 接收者头像 URL
    receiverAvatarThumbUrl?: string; // 接收者头像缩略图 URL
    userId: number;         // 当前用户ID (可能是发送者或接收者)
    syncId: number;         // 会话内消息序号
    content: string;        // 消息内容
    messageType: number;    // 消息类型
    replyMessageId?: number;// 回复的消息ID (可选)
    status: number;         // 消息状态
    extra?: any;            // 附加信息 (可选)
    createTime: string;     // 消息创建时间 (ISO 8601 格式字符串)
    updateTime?: string;     // 消息更新时间 (ISO 8601 格式字符串)
}

/**
 * 服务端推送给客户端的成员聊天状态变更事件。
 * Corresponds to message type 17.
 */
export type ChatStatusType = "idle" | "wait" | "input" | "leave";
export interface ChatStatusEvent {
    roomId: number;  // 状态变更发生的房间ID
    userId: number;  // 状态变更的成员ID
    status: ChatStatusType ;
    windowId?: string; // 可选的窗口标识符，用于区分多窗口环境下的状态更新
}

/**
 * 房间扩展信息(extra)变动事件。
 * Corresponds to message type 15.
 */
export interface RoomExtraChangeEvent {
    roomId: number; // 房间ID
    type: number;   // 变更类型 (1:更新/新增, 2:删除)
    key: string;    // 变更内容的键名
}

/**
 * 房间DND地图变更事件。
 * Corresponds to message type 19.
 */
export interface RoomDndMapChangeEvent {
    roomId: number;
    op: "map_upsert" | "map_clear" | "token_upsert" | "token_remove";
    map?: {
        mapImgUrl?: string;
        gridRows?: number;
        gridCols?: number;
        gridColor?: string;
    };
    token?: {
        roleId: number;
        rowIndex: number;
        colIndex: number;
    };
    clearTokens?: boolean;
    updatedAt?: number;
}

