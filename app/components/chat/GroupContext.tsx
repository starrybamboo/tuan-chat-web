import type { GroupMember } from "../../../api";
// src/context/chat-context.tsx
import { createContext } from "react";

export interface GroupContextType {
  groupId?: number; // 当前激活的群组ID
  groupMembers: GroupMember[];
  curMember?: GroupMember; // 全局登录用户对应的member
}

export const GroupContext = createContext<GroupContextType>({
  groupId: undefined,
  groupMembers: [],
  curMember: undefined,
});
