import type { WebsocketUtils } from "../../api/useWebSocket";
import type { ChatStatusEvent } from "../../api/wsModels";
import { getLocalStorageValue } from "@/components/common/customHooks/useLocalStorage";
import { createContext, use, useMemo } from "react";
import { useWebSocket } from "../../api/useWebSocket";

interface GlobalContextType {
  userId: number | null;
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
  },
});
// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalContext = () => use(GlobalContext);
export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
  const token = getLocalStorageValue<string | null>("token", null);
  const userId = Number(token);
  const websocketUtils = useWebSocket();
  const roomContext: GlobalContextType = useMemo((): GlobalContextType => {
    return {
      userId,
      websocketUtils,
    };
  }, [userId, websocketUtils]);
  return (
    <GlobalContext value={roomContext}>
      {children}
    </GlobalContext>
  );
}
