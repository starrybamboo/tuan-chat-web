import type { WebsocketUtils } from "../../api/useWebSocket";
import type { ChatStatusEvent } from "../../api/wsModels";
import { createContext, use, useEffect, useMemo, useState } from "react";
import { useWebSocket } from "../../api/useWebSocket";

interface GlobalContextType {
  userId: number | null;
  setUserId: (userId: number | null) => void;
  websocketUtils: WebsocketUtils;
}

const GlobalContext = createContext<GlobalContextType>({
  userId: null,
  websocketUtils: {
    connect(): void {
      console.error("Function not implemented.");
    },
    send(_: any): void {
      console.error("Function not implemented.");
    },
    unreadMessagesNumber: {},
    isConnected(): boolean {
      console.error("Function not implemented.");
      return false;
    },
    updateUnreadMessagesNumber(roomId: number, newNumber: number): void {
      console.error(`Function not implemented.${roomId}${newNumber}`);
    },
    receivedMessages: {},
    receivedDirectMessages: {},
    chatStatus: {},
    updateChatStatus(chatStatusEvent: ChatStatusEvent): void {
      console.error(`Function not implemented.${chatStatusEvent}`);
    },
    unreadDirectMessagesNumber: {},
    updateUnreadDirectMessagesNumber(senderId: number, newNumber: number): void {
      console.error(`Function not implemented.${senderId}${newNumber}`);
    },
  },
  setUserId: () => {},
});
// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalContext = () => use(GlobalContext);
export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  // 自动同步 localStorage 变化
  useEffect(() => {
    const token = localStorage.getItem("token");
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setUserId(token ? Number(token) : null);
  }, []);
  const websocketUtils = useWebSocket();
  const roomContext: GlobalContextType = useMemo((): GlobalContextType => {
    return {
      userId,
      setUserId,
      websocketUtils,
    };
  }, [userId, websocketUtils]);
  return (
    <GlobalContext value={roomContext}>
      {children}
    </GlobalContext>
  );
}
