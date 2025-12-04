/**
 * ws相关消息的接口定义
 */
// websocket-types.ts

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
    CLUE_CARD = 1000,
}

/**
 * WebSocket消息基础接口
 */
export interface BaseMessage<T> {
    type: number;
    data: T;
}

/**
 * 客户端发送消息类型
 */

// 心跳包 (type: 2)
export interface HeartbeatMessage extends BaseMessage<{}> {
    type: 2;
}

// 聊天消息 (type: 3)
export interface ChatMessage extends BaseMessage<{
    roomId: number;
    messageType: number;
    roleId: number;
    avatarId: number;
    content: string;
    replayMessageId?: number;
    extra?: any;
}> {
    type: 3;
}

// 聊天状态控制 (type: 4)
export interface ChatStatusMessage extends BaseMessage<{
    roomId: number;
    userId: number;
    status: string;
    windowId: string;
}> {
    type: 4;
}

// 私聊消息 (type: 5)
export interface PrivateMessage extends BaseMessage<{
    messageId: number;
    userId: number;
    syncId: number;
    senderId: number;
    receiverId: number;
    content: string;
    messageType: number;
    replyMessageId?: number;
    status: number;
    extra?: {
        diceResult?: { result: string };
        fileMessage?: { size: number; url: string; fileName: string };
        imageMessage?: { background: boolean; width: number; height: number };
        forwardMessage?: { messageList: any[] };
        soundMessage?: { second: number; url?: string; fileName?: string; size?: number; purpose?: string; volume?: number };
        clueMessage?: { img: string; name: string; description: string };
        effectMessage?: { effectName: string; duration?: number; strength?: number };
    };
    createTime: string;
    updateTime: string;
}> {
    type: 5;
}

// 志愿者注册 (type: 10000)
export interface VolunteerRegisterMessage extends BaseMessage<{
    volunteerName: string;
    capabilities: string[];
    maxConcurrentTasks: number;
}> {
    type: 10000;
}

// 志愿者心跳 (type: 10001)
export interface VolunteerHeartbeatMessage extends BaseMessage<{
    status: 'ACTIVE' | 'BUSY' | 'IDLE';
    currentTasks: number;
    systemInfo: {
        cpuUsage: number;
        memoryUsage: number;
        availableSlots: number;
    };
}> {
    type: 10001;
}

// 请求任务 (type: 10002)
export interface RequestTaskMessage extends BaseMessage<{
    capabilities: string[];
    maxTasks: number;
    priority?: number;
}> {
    type: 10002;
}

// 提交任务结果 (type: 10003)
export interface SubmitTaskResultMessage extends BaseMessage<{
    taskId: number;
    resultData: string;
    executionDuration: number;
    status: string;
    errorMessage?: string;
}> {
    type: 10003;
}

// 任务分配 (type: 10004)
export interface TaskAssignmentMessage extends BaseMessage<{
    taskId: number;
    taskType: string;
    inputData: string;
    taskName: string;
    estimatedDuration?: number;
}> {
    type: 10004;
}

// 任务取消 (type: 10005)
export interface TaskCancelMessage extends BaseMessage<{
    taskId: number;
    reason: string;
}> {
    type: 10005;
}

/**
 * 服务端推送消息类型
 */

// 私聊新消息 (type: 1)
export interface PrivateMessagePush extends BaseMessage<{
    messageId: number;
    userId: number;
    syncId: number;
    senderId: number;
    receiverId: number;
    content: string;
    messageType: number;
    replyMessageId?: number;
    status: number;
    extra?: any;
    createTime: string;
}> {
    type: 1;
}

// 群聊新消息 (type: 4)
export interface GroupMessagePush extends BaseMessage<{
    message: {
        messageId: number;
        syncId: number;
        roomId: number;
        userId: number;
        roleId: number;
        content: string;
        avatarId: number;
        animation: number;
        specialEffects: number;
        replyMessageId?: number;
        status: number;
        messageType: number;
        position?: any;
        extra?: {
            diceResult?: any;
            fileMessage?: any;
            imageMessage?: any;
            forwardMessage?: any;
            soundMessage?: any;
            clueMessage?: any;
            effectMessage?: any;
        };
        createTime: string;
        updateTime: string;
    };
    messageMark: any[];
}> {
    type: 4;
}

// 成员变动 (type: 11)
export interface MemberChangePush extends BaseMessage<{
    roomId: number;
    userIds: number[];
    changeType: 1 | 2 | 3;
    activeStatus: number;
    lastOptTime: string;
}> {
    type: 11;
}

// 角色变动 (type: 12)
export interface RoleChangePush extends BaseMessage<{
    roleIds: number[];
    roomId: number;
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

// 房间extra变动 (type: 15)
export interface RoomExtraChangePush extends BaseMessage<{
    roomId: number;
    type: 1 | 2;
    key: string;
}> {
    type: 15;
}

// 房间禁言状态变动 (type: 16)
export interface RoomMuteStatusPush extends BaseMessage<{
    roomId: number;
    status: 0 | 1;
}> {
    type: 16;
}

// 成员的发言状态 (type: 17)
export interface MemberChatStatusPush extends BaseMessage<{
    roomId: number;
    userId: number;
    status: string;
    windowId: string;
}> {
    type: 17;
}

// 模组角色变动 (type: 18)
export interface ModRoleChangePush extends BaseMessage<{}> {
    type: 18;
}

// 志愿者注册成功 (type: 20000)
export interface VolunteerRegisterSuccessPush extends BaseMessage<null> {
    type: 20000;
}

// 志愿者心跳ACK (type: 20001)
export interface VolunteerHeartbeatAckPush extends BaseMessage<null> {
    type: 20001;
}

// 任务分配推送 (type: 20002)
export interface TaskAssignmentPush extends BaseMessage<null> {
    type: 20002;
}

// 任务取消推送 (type: 20003)
export interface TaskCancelPush extends BaseMessage<null> {
    type: 20003;
}

// 任务进度更新 (type: 20004)
export interface TaskProgressPush extends BaseMessage<null> {
    type: 20004;
}

// 任务结果确认 (type: 20005)
export interface TaskResultConfirmPush extends BaseMessage<null> {
    type: 20005;
}

// token失效 (type: 100)
export interface TokenInvalidPush extends BaseMessage<null> {
    type: 100;
}

/**
 * 联合类型 - 所有客户端发送消息
 */
export type ClientWebSocketMessage =
    | HeartbeatMessage
    | ChatMessage
    | ChatStatusMessage
    | PrivateMessage
    | VolunteerRegisterMessage
    | VolunteerHeartbeatMessage
    | RequestTaskMessage
    | SubmitTaskResultMessage
    | TaskAssignmentMessage
    | TaskCancelMessage;

/**
 * 联合类型 - 所有服务端推送消息
 */
export type ServerWebSocketMessage =
    | PrivateMessagePush
    | GroupMessagePush
    | MemberChangePush
    | RoleChangePush
    | RoomDismissPush
    | RoomExtraChangePush
    | RoomMuteStatusPush
    | MemberChatStatusPush
    | ModRoleChangePush
    | VolunteerRegisterSuccessPush
    | VolunteerHeartbeatAckPush
    | TaskAssignmentPush
    | TaskCancelPush
    | TaskProgressPush
    | TaskResultConfirmPush
    | TokenInvalidPush;

/**
 * 联合类型 - 所有WebSocket消息
 */
export type WebSocketMessage = ClientWebSocketMessage | ServerWebSocketMessage;


/**
 * ================== 为了兼容旧代码而保留的定义 ==================
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


