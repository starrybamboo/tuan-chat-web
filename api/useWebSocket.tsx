import type { ChatMessageRequest } from "./models/ChatMessageRequest";
import type { ChatMessageResponse } from "./models/ChatMessageResponse";
import { getLocalStorageValue, useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { formatLocalDateTime } from "@/utils/dataUtil";
import { useQueryClient } from "@tanstack/react-query";
import {useCallback, useEffect, useRef, useState} from "react";
import { useImmer } from "use-immer";
import {useGlobalContext} from "@/components/globalContextProvider";
import type {
  ChatStatusEvent,
  ChatStatusType,
  DirectMessageEvent,
  MemberChangePush, RoleChangePush,
  RoomExtraChangeEvent
} from "./wsModels";
import {tuanchat} from "./instance";
import {
  useGetUserSessionsQuery,
  useUpdateReadPosition1Mutation
} from "./hooks/messageSessionQueryHooks";
import type {MessageSessionResponse} from "./models/MessageSessionResponse";
import type {ApiResultListMessageSessionResponse} from "./models/ApiResultListMessageSessionResponse";

/**
 * 成员的输入状态（不包含roomId）
 * @param userId
 * @param status (0:空闲, 1:正在输入, 2:等待扮演, 3:暂离)
 */
export interface ChatStatus {
  userId: number;
  status: ChatStatusType;
}
interface WsMessage<T> {
  type: number;
  data?: T;
}

/**
 * @property connect 连接WebSocket
 * @property send 发送消息 发送聊天消息到指定房间(type: 3) 聊天状态控制 (type: 4)
 * @property isConnected 检查连接状态
 * @property receivedMessages 已接收的群聊消息，使用方法：receivedMessages[roomId]
 * @property receivedDirectMessages 已接收的私聊消息，使用方法：receivedDirectMessages[userId]
 * @property unreadMessagesNumber 未读消息数量（群聊部分）
 * @property updateLastReadSyncId 更新未读消息 （群聊部分） 如果lastReadSyncId为undefined，则使用latestSyncId
 * @property chatStatus 成员的输入状态 (0:空闲, 1:正在输入, 2:等待扮演, 3:暂离), 默认为1 (空闲）
 * @property updateChatStatus 成员的输入状态 (0:空闲, 1:正在输入, 2:等待扮演, 3:暂离), 默认为1 (空闲）
 */
export interface WebsocketUtils {
  connect: () => void;
  send: (request: WsMessage<any>) => void;
  isConnected: () => boolean;
  receivedMessages: Record<number, ChatMessageResponse[]>;
  receivedDirectMessages: Record<number, DirectMessageEvent[]>;
  unreadMessagesNumber: Record<number, number>; // 存储未读消息数
  updateLastReadSyncId: (roomId: number, lastReadSyncId?: number) => void;
  chatStatus: Record<number, ChatStatus[]>;
  updateChatStatus: (chatStatusEvent:ChatStatusEvent)=> void;
}

const WS_URL = import.meta.env.VITE_API_WS_URL;

export function useWebSocket() {
  const globalContext = useGlobalContext();

  const wsRef = useRef<WebSocket | null>(null);
  const isConnected = () => wsRef.current?.readyState === WebSocket.OPEN;

  const heartbeatTimer = useRef<NodeJS.Timeout>(setTimeout(() => {}));
  // 接受消息的存储
  const [receivedMessages, updateReceivedMessages] = useImmer<Record<number, ChatMessageResponse[]>>({});
  const [receivedDirectMessages, updateReceivedDirectMessages] = useImmer<Record<number, DirectMessageEvent[]>>({});

  const queryClient = useQueryClient();

  /**
   * 群聊的未读消息数
   */
  const roomSessions : MessageSessionResponse[] = useGetUserSessionsQuery().data?.data ?? [];
  const updateReadPosition1Mutation = useUpdateReadPosition1Mutation();
  const unreadMessagesNumber: Record<number, number> = roomSessions.reduce((acc, session) => {
    if (session.roomId && session.lastReadSyncId && session.latestSyncId) {
      acc[session.roomId] = Math.max(0, session.latestSyncId - session.lastReadSyncId);
    }
    return acc;
  }, {} as Record<number, number>)
  const updateLatestSyncId = (roomId: number, latestSyncId: number) => {
    queryClient.setQueriesData<ApiResultListMessageSessionResponse>({ queryKey: ["getUserSessions"] }, (oldData) => {
      if (!oldData?.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.map(session => {
          if (session.roomId === roomId) {
            return {
              ...session,
              latestSyncId
            };
          }
          return session;
        })
      };
    });
  };
  /**
   * 更新群聊的最后阅读的消息位置
   * @param roomId
   * @param lastReadSyncId
   */
  const updateLastReadSyncId = (roomId: number,lastReadSyncId?: number) => {
    // 减少更新次数，防止出现死循环
    const oldData = queryClient.getQueryData<ApiResultListMessageSessionResponse>(["getUserSessions"])
    if (!oldData?.data) return
    const session = oldData.data.find(session => session.roomId === roomId);
    if (!session) return

    // 如果没有指定lastReadSyncId，则使用latestSyncId更新，也就是读到最后一条消息
    const targetReadySyncId = lastReadSyncId ?? session.latestSyncId!
    if (targetReadySyncId === session.lastReadSyncId)
      return

    queryClient.setQueriesData<ApiResultListMessageSessionResponse>({ queryKey: ["getUserSessions"] }, (oldData) => {
      if (!oldData?.data) return
      //未读消息直接异步更改，漏了也没关系。
      updateReadPosition1Mutation.mutate({
        roomId,
        syncId: targetReadySyncId
      });
      return {
        ...oldData,
        data: oldData.data.map(session => {
          if (session.roomId === roomId) {
            return {
              ...session,
              lastReadSyncId: targetReadySyncId
            };
          }
          return session;
        })
      };
    });
  };
  // 输入状态, 按照roomId进行分组
  const [chatStatus, updateChatStatus] = useImmer<Record<number, ChatStatus[]>>({});

  const token = getLocalStorageValue<number>("token", -1);
  // 配置参数
  const HEARTBEAT_INTERVAL = 25000;

  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        // 设置 onclose 为 null 防止在手动关闭时触发重连逻辑
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  /**
   * 核心连接逻辑
   */
  const connect = useCallback(() => {
    if (isConnected()){
      return;
    }
    // 连接前，先重置消息
    queryClient.resetQueries({ queryKey: ["getMsgPage"] });
    try {
      wsRef.current = new WebSocket(`${WS_URL}?token=${token}`);
      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        reconnectAttempts.current = 0;
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }
        startHeartbeat();
      };

      wsRef.current.onclose = (event) => {
        console.log(`Close code: ${event.code}, Reason: ${event.reason}`);
        stopHeartbeat();

        // 设定重连延迟（指数退避）
        const attempt = reconnectAttempts.current;
        const delay = Math.min(200 * (2 ** attempt), 60000);

        console.log(`WebSocket closed. Attempting to reconnect in ${delay / 1000} seconds.`);

        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }

        reconnectTimer.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      };
      wsRef.current.onmessage = (event) => {
        try {
          const message: WsMessage<any> = JSON.parse(event.data);
          console.log("Received message:", JSON.stringify(message));
          onMessage(message);
        }
        catch (error) {
          console.error("Message parsing failed:", error);
        }
      };
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        wsRef.current?.close();
      };
    }
    catch (error) {
      console.error("Connection failed:", error);
    }
  }, []);

  /**
   * 对收到的消息，按照type进行分类处理
   */
  const onMessage = useCallback((message: WsMessage<any>) => {
    switch (message.type) {
      case 1:{  // 私聊新消息
        handleDirectChatMessage(message.data as DirectMessageEvent)
        break;
      }
      case 4:{ // 群聊新消息
        handleChatMessage(message.data as ChatMessageResponse);
        break;
      }
      case 11:{ // 成员变动
        const event = message as MemberChangePush;
        queryClient.invalidateQueries({ queryKey: ["getRoomMemberList",event.data.roomId] });
        // 如果是加入群组，要更新订阅信息
        if (event.data.changeType === 1){
          queryClient.invalidateQueries({ queryKey: ['getUserSessions',event.data.roomId] });
          queryClient.invalidateQueries({ queryKey: ['getRoomSession'] });
        }
        break;
      }
      case 12:{ // 角色变动
        const event = message as RoleChangePush
        queryClient.invalidateQueries({ queryKey: ["spaceRole"] });
        queryClient.invalidateQueries({ queryKey: ["roomRole",event.data.roomId] });
        break;
      }
      case 14:{ // 房间解散
        queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] });
        queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
        break;
      }
      case 15:{ // 房间extra变动
        const event = message.data as RoomExtraChangeEvent;
        queryClient.invalidateQueries({queryKey: ['getRoomExtra',event.roomId,event.key]});
        console.log("Room extra change:", event);
        break;
      }
      case 16: { // 房间禁言状态变动
        const { roomId } = message.data;
        queryClient.invalidateQueries({ queryKey: ['getRoomExtra', roomId] });
        queryClient.invalidateQueries({ queryKey: ['getRoomInfo', roomId] });
        break;
      }
      case 17: { // 成员的发言状态变动
        handleChatStatusChange(message.data as ChatStatusEvent)
        break;
      }
      case 100: { // Token invalidated
        // TODO
      }
    }
  }, []);

  /**
   * 处理群聊消息
   * @param chatMessageResponse
   */
  const handleChatMessage = async (chatMessageResponse: ChatMessageResponse) => {
    if (!(chatMessageResponse?.message.createTime) && chatMessageResponse != undefined) {
      chatMessageResponse.message.createTime = formatLocalDateTime(new Date());
    }
    if (chatMessageResponse != undefined && chatMessageResponse) {
      const roomId = chatMessageResponse.message.roomId;
      if (chatMessageResponse.message.status === 0) {
        updateLatestSyncId(roomId, chatMessageResponse.message.syncId)
      }

      let messagesToAdd: ChatMessageResponse[] = [];
      const currentMessages = receivedMessages[roomId] || [];
      // 检查syncId是否连续
      if (currentMessages.length > 0) {
        const lastSyncId = currentMessages[currentMessages.length - 1].message.syncId;
        if (chatMessageResponse.message.syncId - lastSyncId > 1) {
          // 直接获取所有syncId大于lastsSyncId的消息。
          const lostMessagesResponse = await tuanchat.chatController.getHistoryMessages({
            roomId,
            syncId: lastSyncId + 1
          });
          const lostMessages = lostMessagesResponse.data ?? [];
          messagesToAdd.push(...lostMessages);
        }
      }
      if (messagesToAdd.length === 0 || messagesToAdd[messagesToAdd.length-1].message.messageId !== chatMessageResponse.message.messageId){
        messagesToAdd.push(chatMessageResponse);
      }
      updateReceivedMessages(draft => {
        if (draft[roomId]) {
          draft[roomId].push(...messagesToAdd);
        } else {
          draft[roomId] = messagesToAdd;
        }
      });
      // 更新发送用户的输入状态（设置为空闲，避免重复状态更新）
      const sendingUserId = chatMessageResponse.message.userId;
      if (sendingUserId) {
        // 使用延迟设置为空闲，避免与其他窗口的状态更新冲突
        setTimeout(() => {
          handleChatStatusChange({roomId, userId: sendingUserId, status:"idle"});
        }, 500); // 延迟500ms再设置为空闲
      }
    }
  };
  /**
   * 处理私聊消息
   */
  const handleDirectChatMessage = (message: DirectMessageEvent) => {
    const {receiverId, senderId} = message;
    const channelId = globalContext.userId === senderId ? receiverId : senderId; // 如果是自己发的私聊消息，则channelId为接收者Id

    updateReceivedDirectMessages((draft)=>{
      // 去重，比如撤回操作就会出现相同消息id的情况。
      if (channelId in draft) {
        // 查找已存在消息的索引
        const existingIndex = draft[channelId].findIndex(
            msg => message.messageId === msg.messageId,
        );
        if (existingIndex !== -1) {
          // 更新已存在的消息
          draft[channelId][existingIndex] = message;
        }
        else {
          draft[channelId].push(message);
        }
      }
      else {
        draft[channelId] = [message];
      }
    })
    console.log(receivedDirectMessages)
  };
  /**
   * 处理群聊成员状态变动
   */
  const handleChatStatusChange = (chatStatusEvent: ChatStatusEvent) => {
    const {roomId, userId, status} = chatStatusEvent
    updateChatStatus(draft => {
      if (!draft[roomId]) draft[roomId] = [];
      const userIndex = draft[roomId].findIndex(u => u.userId === userId);
      if (status === "idle") { // 代表Idle，去除
        if (userIndex !== -1) draft[roomId].splice(userIndex, 1);
      } else {
        if (userIndex !== -1) draft[roomId][userIndex].status = status;
        else draft[roomId].push({ userId, status });
      }
    });
  }
  /**
   * 心跳逻辑
   */
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 2 })); // 发送标准心跳
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    heartbeatTimer.current && clearInterval(heartbeatTimer.current);
  }, []);

  /**
   * 发送消息给后端
   * @param request 要发送的对象
   * 发送聊天消息到指定房间(type: 3)
   * 聊天状态控制 (type: 4)
   */
  async function send(request: WsMessage<any>) {
    if (!isConnected) {
      connect()
    }
    console.log("发送消息: ",request);
    for (let i = 0; i < 1000; i++) {
      if (wsRef.current?.readyState === WebSocket.OPEN)
        break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    wsRef?.current?.send(JSON.stringify(request));
  }

  const webSocketUtils: WebsocketUtils = {
    connect,
    send,
    isConnected,
    receivedMessages,
    receivedDirectMessages,
    unreadMessagesNumber,
    updateLastReadSyncId,
    chatStatus,
    updateChatStatus: handleChatStatusChange,
  };
  return webSocketUtils;
}
