// src/context/chat-context.tsx
import type React from "react";
import type { Message, RoomMember, UserRole } from "../../../api";
import { createContext } from "react";

export interface RoomContextType {
  roomId?: number; // 当前激活的群组ID
  roomMembers: RoomMember[];
  curMember?: RoomMember; // 全局登录用户对应的member
  roomRolesThatUserOwn: UserRole[]; // 当前登录用户在这个房间里所拥有的角色
  curRoleId?: number; // 当前选中的角色ID
  curAvatarId?: number; // 当前选中的角色的立绘ID
  useChatBubbleStyle: boolean; // 是否使用气泡样式
  spaceId?: number; // 当前激活的空间ID
  setReplyMessage?: React.Dispatch<React.SetStateAction<Message | undefined>>; // 设置回复消息
  historyMessages?: Message[]; // 历史消息
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
  historyMessages: [],
});
