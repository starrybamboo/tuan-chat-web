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
    WEBGAL_COMMAND = 10,
    /** WebGAL 变量变更消息（结构化） */
    WEBGAL_VAR = 11,
    /** 跑团：检定/指令请求消息（点击后由他人“一键发送”执行） */
    COMMAND_REQUEST = 12,
    /** WebGAL 选择消息（结构化选项） */
    WEBGAL_CHOOSE = 13,
    VIDEO = 14,
    CLUE_CARD = 1000,
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
 * 客户端发送消息类型
 */

// 心跳包 (type: 2)
interface HeartbeatMessage extends BaseMessage<{}> {
    type: 2;
}

// 聊天消息 (type: 3)
interface ChatMessage extends BaseMessage<{
    roomId: number;
    /** Thread Root MessageId；为空表示主消息流 */
    threadId?: number;
    messageType: number;
    roleId: number;
    avatarId: number;
    content: string;
    /** 消息标注 */
    annotations?: string[];
    /** 自定义角色名（为空则使用角色名） */
    customRoleName?: string;
    replayMessageId?: number;
    /** WebGAL 相关演出设置/指令等（后端为 JSON 字段，透传即可） */
    webgal?: any;
    extra?: any;
}> {
    type: 3;
}

// 聊天状态控制 (type: 4)
interface ChatStatusMessage extends BaseMessage<{
    roomId: number;
    userId: number;
    status: string;
    windowId: string;
}> {
    type: 4;
}

// 私聊消息 (type: 5)
interface PrivateMessage extends BaseMessage<{
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
        videoMessage?: { second?: number; url?: string; fileName?: string; size?: number };
        clueMessage?: { img: string; name: string; description: string };
        effectMessage?: { effectName: string; duration?: number; strength?: number };
        commandRequest?: { command: string; allowAll?: boolean; allowedRoleIds?: number[] };
    };
    createTime: string;
    updateTime: string;
}> {
    type: 5;
}

// 志愿者注册 (type: 10000)
interface VolunteerRegisterMessage extends BaseMessage<{
    volunteerName: string;
    capabilities: string[];
    maxConcurrentTasks: number;
}> {
    type: 10000;
}

// 志愿者心跳 (type: 10001)
interface VolunteerHeartbeatMessage extends BaseMessage<{
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
interface RequestTaskMessage extends BaseMessage<{
    capabilities: string[];
    maxTasks: number;
    priority?: number;
}> {
    type: 10002;
}

// 提交任务结果 (type: 10003)
interface SubmitTaskResultMessage extends BaseMessage<{
    taskId: number;
    resultData: string;
    executionDuration: number;
    status: string;
    errorMessage?: string;
}> {
    type: 10003;
}

// 任务分配 (type: 10004)
interface TaskAssignmentMessage extends BaseMessage<{
    taskId: number;
    taskType: string;
    inputData: string;
    taskName: string;
    estimatedDuration?: number;
}> {
    type: 10004;
}

// 任务取消 (type: 10005)
interface TaskCancelMessage extends BaseMessage<{
    taskId: number;
    reason: string;
}> {
    type: 10005;
}

/**
 * 服务端推送消息类型
 */

// 私聊新消息 (type: 1)
interface PrivateMessagePush extends BaseMessage<{
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
interface GroupMessagePush extends BaseMessage<{
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
            videoMessage?: any;
            clueMessage?: any;
            effectMessage?: any;
        };
        createTime: string;
        updateTime: string;
    };
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
interface RoomExtraChangePush extends BaseMessage<{
    roomId: number;
    type: 1 | 2;
    key: string;
}> {
    type: 15;
}

// 房间禁言状态变动 (type: 16)
interface RoomMuteStatusPush extends BaseMessage<{
    roomId: number;
    status: 0 | 1;
}> {
    type: 16;
}

// 成员的发言状态 (type: 17)
interface MemberChatStatusPush extends BaseMessage<{
    roomId: number;
    userId: number;
    status: string;
    windowId: string;
}> {
    type: 17;
}

// 房间DND地图变更 (type: 19)
interface RoomDndMapChangePush extends BaseMessage<{
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
}> {
    type: 19;
}

// 空间频道树变更 (type: 22)
export interface SpaceSidebarTreeUpdatedPush extends BaseMessage<{
    spaceId: number;
    version: number;
    updatedBy?: number;
}> {
    type: 22;
}

// 模组角色变动 (type: 18)
interface ModRoleChangePush extends BaseMessage<{}> {
    type: 18;
}

// 新的好友申请 (type: 21)
export interface NewFriendRequestPush extends BaseMessage<{
    friendReqId: number;
    targetUserId: number;
    verifyMsg: string;
}> {
    type: 21;
}

// 志愿者注册成功 (type: 20000)
interface VolunteerRegisterSuccessPush extends BaseMessage<null> {
    type: 20000;
}

// 志愿者心跳ACK (type: 20001)
interface VolunteerHeartbeatAckPush extends BaseMessage<null> {
    type: 20001;
}

// 任务分配推送 (type: 20002)
interface TaskAssignmentPush extends BaseMessage<null> {
    type: 20002;
}

// 任务取消推送 (type: 20003)
interface TaskCancelPush extends BaseMessage<null> {
    type: 20003;
}

// 任务进度更新 (type: 20004)
interface TaskProgressPush extends BaseMessage<null> {
    type: 20004;
}

// 任务结果确认 (type: 20005)
interface TaskResultConfirmPush extends BaseMessage<null> {
    type: 20005;
}

// tokenʧЧ (type: 100)
interface TokenInvalidPush extends BaseMessage<null> {
    type: 100;
}

/**
 * 联合类型 - 所有客户端发送消息
 */
type ClientWebSocketMessage =
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
type ServerWebSocketMessage =
    | PrivateMessagePush
    | GroupMessagePush
    | MemberChangePush
    | RoleChangePush
    | RoomDismissPush
    | RoomExtraChangePush
    | RoomMuteStatusPush
    | MemberChatStatusPush
    | ModRoleChangePush
    | RoomDndMapChangePush
    | NewFriendRequestPush
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
type WebSocketMessage = ClientWebSocketMessage | ServerWebSocketMessage;


/**
 * ================== 为了兼容旧代码而保留的定义 ==================
 */

/**
 * 客户端发送给服务端的聊天状态变更请求。
 * Corresponds to message type 4.
 */
interface ChatStatusRequest {
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



