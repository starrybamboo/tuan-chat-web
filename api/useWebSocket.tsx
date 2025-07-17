import type { ChatMessageRequest } from "./models/ChatMessageRequest";
import type { ChatMessageResponse } from "./models/ChatMessageResponse";
import { getLocalStorageValue, useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { formatLocalDateTime } from "@/utils/dataUtil";
import { useQueryClient } from "@tanstack/react-query";
import {useCallback, useEffect, useRef, useState} from "react";
import { useImmer } from "use-immer";
import {useGlobalContext} from "@/components/globalContextProvider";
import {uploadFile} from "@/webGAL/fileOperator";
import message from "@/components/common/message/message";
import type {ChatStatusEvent, ChatStatusType, DirectMessageEvent} from "./wsModels";

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
 * @property updateUnreadMessagesNumber 更新未读消息数量 （群聊部分）
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
  unreadDirectMessagesNumber: Record<number, number>;
  updateUnreadMessagesNumber: (roomId: number, newNumber: number,) => void;
  updateUnreadDirectMessagesNumber: (senderId: number, newNumber: number,) => void;
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

  // 新消息数记录，用于显示红点
  const [unreadMessagesNumber, setUnreadMessagesNumber] = useState<Record<number, number>>({});
  // 输入状态, 按照roomId进行分组
  const [chatStatus, updateChatStatus] = useImmer<Record<number, ChatStatus[]>>({});

  // 私聊新消息数记录（从localStorage中读取）
  const [unreadDirectMessagesNumber, setUnreadDirectMessagesNumber] = useLocalStorage<Record<number, number>>(
    `unreadDirectMessages_${globalContext.userId}`,
    {}
  );
  const token = getLocalStorageValue<number>("token", -1);
  // 配置参数
  const HEARTBEAT_INTERVAL = 25000;

  if (typeof window !== "undefined"){
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" &&  wsRef.current?.readyState !== WebSocket.OPEN) {
        connect();
      }
    });
  }

  useEffect(() => {
    connect();
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
        startHeartbeat();
      };

      wsRef.current.onclose = (event) => {
        console.log(`Close code: ${event.code}, Reason: ${event.reason}`);
        connect();
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
        queryClient.invalidateQueries({ queryKey: ["getSpaceMemberList"] });
        queryClient.invalidateQueries({ queryKey: ["getRoomMemberList"] });
        break;
      }
      case 12:{ // 角色变动
        queryClient.invalidateQueries({ queryKey: ["spaceRole"] });
        queryClient.invalidateQueries({ queryKey: ["roomRole"] });
        break;
      }
      case 14:{ // 房间解散
        queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] });
        queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
        break;
      }
      case 15:{ // 房间extra变动
        queryClient.invalidateQueries({queryKey: ['getRoomExtra'],});
        queryClient.invalidateQueries({queryKey: ['getRoomInitiativeList'],});
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
  const handleChatMessage = (chatMessageResponse: ChatMessageResponse) => {
    if (!(chatMessageResponse?.message.createTime) && chatMessageResponse != undefined) {
      chatMessageResponse.message.createTime = formatLocalDateTime(new Date());
    }
    if (chatMessageResponse != undefined && chatMessageResponse) {
      const roomId = chatMessageResponse.message.roomId;
      if (chatMessageResponse.message.status === 0) {
        setUnreadMessagesNumber(prev => ({
          ...prev,
          [roomId]: (prev[roomId] || 0) + 1,
        }));
      }
      // 把接受消息放到接收消息缓存列表里面
      updateReceivedMessages((draft) => {
        if (roomId in draft) {
          // 查找已存在消息的索引
          const existingIndex = draft[roomId].findIndex(
            msg => msg.message.messageID === chatMessageResponse.message.messageID,
          );
          if (existingIndex !== -1) {
            // 更新已存在的消息
            draft[roomId][existingIndex] = chatMessageResponse;
          }
          else {
            draft[roomId].push(chatMessageResponse);
          }
        }
        else {
          draft[roomId] = [chatMessageResponse];
        }
      });
      // 更新发送用户的输入状态
      handleChatStatusChange({roomId, userId:chatMessageResponse.message.userId, status:"idle"})
    }
  };
  /**
   * 处理私聊消息
   */
  const handleDirectChatMessage = (message: DirectMessageEvent) => {
    const {receiverId, senderId} = message;
    const channelId = globalContext.userId === senderId ? receiverId : senderId; // 如果是自己发的私聊消息，则channelId为接收者Id

    if (message.status === 0 && globalContext.userId !== channelId) {
      setUnreadDirectMessagesNumber(prev => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    }

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

  /**
   * 更新未读消息数量
   * @param roomId 房间id
   * @param newNumber 新的未读消息数量
   */
  const updateUnreadMessagesNumber
        = (roomId: number, newNumber: number) => {
          setUnreadMessagesNumber(prev => ({
            ...prev,
            [roomId]: newNumber,
          }));
        };
        
  /**
   * 更新私聊未读消息数量
   * @param senderId 发送者id
   * @param newNumber 新的未读消息数量
   * */
  const updateUnreadDirectMessagesNumber
        = (senderId: number, newNumber: number) => {
          setUnreadDirectMessagesNumber(prev => ({
            ...prev,
            [senderId]: newNumber,
          }));
        };
  
  
  const webSocketUtils: WebsocketUtils = {
    connect,
    send,
    isConnected,
    receivedMessages,
    receivedDirectMessages,
    unreadMessagesNumber,
    unreadDirectMessagesNumber,
    updateUnreadMessagesNumber,
    updateUnreadDirectMessagesNumber,
    chatStatus,
    updateChatStatus: handleChatStatusChange,
  };
  return webSocketUtils;
}
