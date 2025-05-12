import type { ChatMessageRequest, ChatMessageResponse } from "api";
import type { WebsocketUtils } from "../../api/useWebSocket";
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
    send(_: ChatMessageRequest): void {
      console.error("Function not implemented.");
    },
    isConnected: false,
    getTempMessagesByRoomId(roomId: number, cleanTemp: boolean): ChatMessageResponse[] {
      throw new Error(`Function not implemented.${roomId} ${cleanTemp}`);
    },
    messagesNumber: {},
    unreadMessagesNumber: {},
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
