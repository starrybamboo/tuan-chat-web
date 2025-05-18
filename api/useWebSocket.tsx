import type { ChatMessageRequest } from "./models/ChatMessageRequest";
import type { ChatMessageResponse } from "./models/ChatMessageResponse";
import { getLocalStorageValue } from "@/components/common/customHooks/useLocalStorage";
import { formatLocalDateTime } from "@/utils/dataUtil";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useImmer } from "use-immer";

// type WsMessageType =
//     | 2 // 心跳
//     | 3 // 聊天消息
//     | 4 // 聊天消息同步

interface WsMessage<T> {
  type: number;
  data?: T;
}

export interface WebsocketUtils {
  connect: () => void;
  send: (request: ChatMessageRequest) => void;
  getTempMessagesByRoomId: (roomId: number, cleanTemp: boolean) => ChatMessageResponse[];
  isConnected: boolean;
  messagesNumber: Record<number, number>; // roomId to messagesNumber,统计到目前为止接受了多少条新消息,用于通知下游组件接受到了新消息
  unreadMessagesNumber: Record<number, number>; // 存储未读消息数
  updateUnreadMessagesNumber: (roomId: number, newNumber: number,) => void;
}

const WS_URL = import.meta.env.VITE_API_WS_URL;
// const WS_URL = "ws://39.103.58.31:8090"
export function useWebSocket() {
  // let token = "-1"
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const heartbeatTimer = useRef<NodeJS.Timeout>(setTimeout(() => {}));
  // 接受消息的存储
  const [tempMessages, updateTempMessages] = useImmer<Record<number, ChatMessageResponse[]>>({});
  const [messagesNumber, updateMessagesNumber] = useImmer<Record<number, number>>({});
  const queryClient = useQueryClient();

  // 新消息数记录，用于显示红点
  // const [unreadMessagesNumber, setUnreadMessagesNumber] = useLocalStorage<Record<number, number>>("unreadMessagesNumber",{});
  const [unreadMessagesNumber, setUnreadMessagesNumber] = useState<Record<number, number>>({});

  const token = getLocalStorageValue<number>("token", -1);
  // 配置参数
  const MAX_RECONNECT_ATTEMPTS = 12;
  const HEARTBEAT_INTERVAL = 25000;
  const RECONNECT_DELAY_BASE = 10;

  // 核心连接逻辑
  const connect = useCallback(() => {
    if (wsRef.current || !WS_URL)
      return;

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !isConnected) {
        connect();
      }
    });

    try {
      wsRef.current = new WebSocket(`${WS_URL}?token=${token}`);
      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        startHeartbeat();
      };

      wsRef.current.onclose = (event) => {
        console.log(`Close code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        // handleReconnect(MAX_RECONNECT_ATTEMPTS)
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WsMessage<ChatMessageResponse> = JSON.parse(event.data);
          console.log("Received message:", JSON.stringify(message));
          switch (message.type) {
            case 3:
            case 4:{
              message.data && handleChatMessage(message.data);
              break;
            }
            case 11:{
              queryClient.invalidateQueries({ queryKey: ["getSpaceMemberList"] });
              queryClient.invalidateQueries({ queryKey: ["getRoomMemberList"] });
              break;
            }
            case 12:{
              queryClient.invalidateQueries({ queryKey: ["spaceRole"] });
              queryClient.invalidateQueries({ queryKey: ["roomRole"] });
              break;
            }
            case 14:{
              queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] });
              queryClient.invalidateQueries({ queryKey: ["getUserRooms"] });
            }
          }
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
      handleReconnect(MAX_RECONNECT_ATTEMPTS);
    }
  }, []);

  const handleChatMessage = (chatMessageResponse: ChatMessageResponse) => {
    if (!(chatMessageResponse?.message.createTime) && chatMessageResponse != undefined) {
      chatMessageResponse.message.createTime = formatLocalDateTime(new Date());
    }
    if (chatMessageResponse != undefined && chatMessageResponse) {
      const roomId = chatMessageResponse.message.roomId;
      updateMessagesNumber((draft) => {
        if (roomId in draft) {
          draft[roomId] += 1;
        }
        else {
          draft[roomId] = 1;
        }
      });
      if (chatMessageResponse.message.status === 0) {
        setUnreadMessagesNumber(prev => ({
          ...prev,
          [roomId]: (prev[roomId] || 0) + 1,
        }));
      }

      updateTempMessages((draft) => {
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
    }
  };

  // 重连机制
  const handleReconnect = useCallback((remainAttempts: number) => {
    if (remainAttempts === 0 || isConnected)
      return;
    connect();
    const delay = Math.min(
      RECONNECT_DELAY_BASE * 2 ** (MAX_RECONNECT_ATTEMPTS - remainAttempts),
      30000,
    );
    console.log(`Reconnecting in ${delay}ms...`);
    setTimeout(() => handleReconnect(remainAttempts - 1), delay);
  }, [connect]);

  // 心跳机制
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

  async function send(request: ChatMessageRequest) {
    if (!isConnected) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      handleReconnect(MAX_RECONNECT_ATTEMPTS);
    }
    for (let i = 0; i < 1000; i++) {
      if (wsRef.current?.readyState === WebSocket.OPEN)
        break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    try {
      const message: WsMessage<ChatMessageRequest> = {
        type: 3, // 聊天消息类型
        data: request,
      };
      wsRef?.current?.send(JSON.stringify(message));
      console.log("Sent message:", JSON.stringify(message));
    }
    catch (e) {
      console.error("Message Serialization Failed:", e);
    }
  }

  //
  const getTempMessagesByRoomId = (roomId: number, cleanTemp: boolean): ChatMessageResponse[] => {
    // return tempMessages[roomId] || []
    if (!tempMessages[roomId]) {
      return [];
    }
    // updateTempMessages(draft => {draft[roomId] = []})
    return tempMessages[roomId] || [];
  };

  const updateUnreadMessagesNumber
        = (roomId: number, newNumber: number) => {
          setUnreadMessagesNumber(prev => ({
            ...prev,
            [roomId]: newNumber,
          }));
        };

  const webSocketUtils: WebsocketUtils = {
    isConnected,
    getTempMessagesByRoomId,
    connect,
    send,
    messagesNumber,
    unreadMessagesNumber,
    updateUnreadMessagesNumber,
  };
  return webSocketUtils;
}
