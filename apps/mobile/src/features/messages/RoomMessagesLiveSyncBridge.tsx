import { usePathname } from "expo-router";

import { useRoomMessagesLiveSync } from "@/features/messages/useRoomMessagesLiveSync";
import { useWorkspaceSession } from "@/features/workspace/workspace-session";

/**
 * 登录后挂载的全局实时桥：维持一条全局 WebSocket 连接，
 * 不依赖用户停留在聊天页。收到消息/通知时根据当前会话与路由决定是否弹本地通知。
 */
export function RoomMessagesLiveSyncBridge() {
  const pathname = usePathname();
  const { activeDirectContactId, selectedRoomId, selectedSpaceId } = useWorkspaceSession();

  // 聊天 tab 为根路由 "/"；只有它在前台时才抑制当前会话的通知。
  const isChatRouteActive = pathname === "/";

  useRoomMessagesLiveSync({
    currentContactId: activeDirectContactId,
    currentRoomId: selectedRoomId,
    currentSpaceId: selectedSpaceId,
    isChatRouteActive,
  });

  return null;
}
