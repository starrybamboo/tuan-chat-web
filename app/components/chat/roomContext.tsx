// src/context/chat-context.tsx
import type React from "react";
import type { Message, RoomMember, UserRole } from "../../../api";
import { createContext } from "react";

export interface RoomContextType {
  roomId?: number; // 当前激活的群组ID
  roomMembers: RoomMember[];
  curMember?: RoomMember; // 全局登录用户对应的member
  roomRolesThatUserOwn: UserRole[];
  curRoleId?: number;
  curAvatarId?: number;
  useChatBubbleStyle: boolean;
  spaceId?: number;
  setReplyMessage?: React.Dispatch<React.SetStateAction<Message | undefined>>;
}

export const RoomContext = createContext<RoomContextType>({
  roomId: undefined,
  roomMembers: [],
  curMember: undefined,
  roomRolesThatUserOwn: [],
  curAvatarId: undefined,
  curRoleId: undefined,
  useChatBubbleStyle: false,
  spaceId: undefined,
  setReplyMessage: undefined,
});
