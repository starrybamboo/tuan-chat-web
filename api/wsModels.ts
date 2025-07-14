/**
 * ws相关消息的接口定义
 */

/**
 * 客户端发送给服务端的聊天状态变更请求。
 * Corresponds to message type 4.
 */
export interface ChatStatusRequest {
    roomId: number;  // 目标房间ID
    userId: number;  // 发送状态变更的用户ID
    status: number;  // 新的聊天状态码 (0:空闲, 1:正在输入, 2:等待扮演, 3:暂离)
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
    receiverId: number;     // 接收者ID
    content: string;        // 消息内容
    messageType: number;    // 消息类型
    replyMessageId?: number;// 回复的消息ID (可选)
    status: number;         // 消息状态
    extra?: any;            // 附加信息 (可选)
    createTime: string;     // 消息创建时间 (ISO 8601 格式字符串)
}

/**
 * 房间成员变动事件。
 * Corresponds to message type 11.
 */
export interface MemberChangeEvent {
    roomId: number;         // 房间ID
    userIds: number[];      // 变动的用户ID列表
    changeType: number;     // 变动类型 (1:加入, 2:移除, 3:权限更新)
    activeStatus: number;   // 活跃状态
    lastOptTime: string;    // 最后操作时间
}

/**
 * 房间角色变动事件。
 * Corresponds to message type 12.
 */
export interface RoleChangeEvent {
    roleIds: number[];      // 变动的角色ID列表
    roomId: number;         // 房间ID
    changeType: number;     // 变动类型 (1:加入, 2:移除)
}

/**
 * 房间解散事件。
 * Corresponds to message type 14.
 */
export interface RoomDisbandEvent {
    roomId: number; // 被解散的房间ID
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
 * 房间禁言状态变动事件。
 * Corresponds to message type 16.
 */
export interface RoomMuteEvent {
    roomId: number; // 房间ID
    status: number; // 禁言状态 (0:未禁言, 1:全员禁言)
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
}


/**
 * Token失效通知事件，客户端收到后需要重新登录。
 * Corresponds to message type 100.
 */
export interface TokenInvalidEvent {
    data: null; // data 字段为 null
}