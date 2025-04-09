// src/context/chat-context.tsx
import { createContext } from "react";

interface GroupContextType {
  groupId?: number; // 当前激活的群组ID
}

export const GroupContext = createContext<GroupContextType>({
  groupId: undefined,
});
