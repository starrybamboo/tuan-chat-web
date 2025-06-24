import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
// src/context/chat-context.tsx
import type React from "react";
import type {
  ApiResultCursorPageBaseResponseChatMessageResponse,
  ChatMessageResponse,
  Message,
  RoomMember,
  UserRole,
} from "../../../api";
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
  historyMessages?: ChatMessageResponse[]; // 历史消息，整合了用html请求到的消息和从websocket获取到的新消息，已按照pos进行排序
  messageInfiniteQuery?: UseInfiniteQueryResult<InfiniteData<ApiResultCursorPageBaseResponseChatMessageResponse, unknown>, Error>;
  // 获取历史消息的钩子函数，由于infiniteQuery是个有状态的东西，不能重复定义，所以放在了context里面
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
  messageInfiniteQuery: undefined,
});
