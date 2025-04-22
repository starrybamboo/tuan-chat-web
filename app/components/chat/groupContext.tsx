import type { GroupMember, UserRole } from "../../../api";
// src/context/chat-context.tsx
import { createContext } from "react";

export interface GroupContextType {
  groupId?: number; // 当前激活的群组ID
  groupMembers: GroupMember[];
  curMember?: GroupMember; // 全局登录用户对应的member
  groupRolesThatUserOwn: UserRole[];
  curRoleId?: number;
  curAvatarId?: number;
}

export const GroupContext = createContext<GroupContextType>({
  groupId: undefined,
  groupMembers: [],
  curMember: undefined,
  groupRolesThatUserOwn: [],
  curAvatarId: undefined,
  curRoleId: undefined,
});
