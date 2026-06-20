import { createContext, use, useEffect, useMemo, useState } from "react";

import { AUTH_SESSION_CHANGED_EVENT, readStoredAuthUserId } from "@/utils/auth/sessionEvents";

import type { WebsocketUtils } from "../../api/useWebSocket";
import type { ChatStatusEvent } from "../../api/wsModels";

import { useWebSocket } from "../../api/useWebSocket";

type GlobalContextType = {
  userId: number | null;
  websocketUtils: WebsocketUtils;
}

const DEFAULT_WEBSOCKET_UTILS: WebsocketUtils = {
  connect(): void {
    console.error("Function not implemented.");
  },
  send(_: any): void {
    console.error("Function not implemented.");
  },
  sendWithResult(_: any): Promise<boolean> {
    console.error("Function not implemented.");
    return Promise.resolve(false);
  },
  unreadMessagesNumber: {},
  isConnected(): boolean {
    console.error("Function not implemented.");
    return false;
  },
  updateLastReadSyncId(roomId: number, newSyncId?: number): void {
    console.error(`Function not implemented.${roomId}${newSyncId}`);
  },
  receivedMessages: {},
  receivedDirectMessages: {},
  chatStatus: {},
  updateChatStatus(chatStatusEvent: ChatStatusEvent): void {
    console.error(`Function not implemented.${chatStatusEvent}`);
  },
  pushOptimisticDirectMessage(): number | null {
    console.error("Function not implemented.");
    return null;
  },
  removeOptimisticDirectMessage(_: number): void {
    console.error("Function not implemented.");
  },
};

const GlobalUserIdContext = createContext<number | null>(null);
const GlobalWebSocketContext = createContext<WebsocketUtils>(DEFAULT_WEBSOCKET_UTILS);

export const useGlobalUserId = () => use(GlobalUserIdContext);

export const useGlobalWebSocket = () => use(GlobalWebSocketContext);

export function useGlobalContext(): GlobalContextType {
  const userId = useGlobalUserId();
  const websocketUtils = useGlobalWebSocket();
  return useMemo(() => ({ userId, websocketUtils }), [userId, websocketUtils]);
}
export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
  // 注意：后端已切换到 Sa-Token，token 不再可反推出 userId。
  // 这里使用登录后缓存的 uid。
  const [userId, setUserId] = useState<number | null>(() => readStoredAuthUserId());
  const websocketUtils = useWebSocket();

  useEffect(() => {
    const handleAuthSessionChanged = () => {
      setUserId(readStoredAuthUserId());
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChanged);
    window.addEventListener("storage", handleAuthSessionChanged);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthSessionChanged);
      window.removeEventListener("storage", handleAuthSessionChanged);
    };
  }, []);

  return (
    <GlobalUserIdContext value={userId}>
      <GlobalWebSocketContext value={websocketUtils}>
        {children}
      </GlobalWebSocketContext>
    </GlobalUserIdContext>
  );
}
