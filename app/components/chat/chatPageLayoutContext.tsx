import type { DocTcHeaderPayload, RoomSettingState, SpaceDetailTab } from "@/components/chat/chatPage.types";

import { createContext, use } from "react";

export interface ChatPageLayoutContextValue {
  isPrivateChatMode: boolean;
  activeSpaceId: number | null;
  activeRoomId: number | null;
  activeDocId: string | null;
  targetMessageId: number | null;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  isSpaceDetailRoute: boolean;
  spaceDetailTab: SpaceDetailTab;
  closeSpaceDetailPanel: () => void;
  roomSettingState: RoomSettingState;
  closeRoomSettingPage: () => void;
  isKPInSpace: boolean;
  activeDocTitleForTcHeader: string;
  onDocTcHeaderChange: (payload: DocTcHeaderPayload) => void;
}

export const ChatPageLayoutContext = createContext<ChatPageLayoutContextValue | null>(null);

export function useChatPageLayoutContext() {
  const context = use(ChatPageLayoutContext);
  if (!context) {
    throw new Error("useChatPageLayoutContext must be used within ChatPageLayoutProvider.");
  }
  return context;
}
