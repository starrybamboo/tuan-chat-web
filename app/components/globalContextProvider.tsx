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
    updateLastReadSyncId(roomId: number, newSyncId?: number): void {
      console.error(`Function not implemented.${roomId}${newSyncId}`);
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
  // 注意：后端已切换到 Sa-Token，token 不再可反推出 userId。
  // 这里使用登录后缓存的 uid。
  const userId = getLocalStorageValue<number | null>("uid", null);
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
