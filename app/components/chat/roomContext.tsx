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
  /** 当前激活的群组ID */
  roomId?: number;

  /** 房间成员列表 */
  roomMembers: RoomMember[];

  /** 当前登录用户对应的成员信息 */
  curMember?: RoomMember;

  /** 当前用户在该房间拥有的角色列表 */
  roomRolesThatUserOwn: UserRole[];

  /** 当前选中的角色ID */
  curRoleId?: number;

  /** 当前选中角色的立绘ID */
  curAvatarId?: number;

  /** 是否使用气泡样式显示消息 */
  useChatBubbleStyle: boolean;

  /** 当前激活的空间ID */
  spaceId?: number;

  /** 设置回复消息的回调函数 */
  setReplyMessage?: React.Dispatch<React.SetStateAction<Message | undefined>>;

  /**
   * 历史消息列表
   * 包含通过HTML请求获取的消息和WebSocket接收的新消息
   * 已按照位置(pos)排序
   */
  historyMessages?: ChatMessageResponse[];

  /**
   * 无限滚动查询结果
   * 用于获取历史消息的分页数据
   * 由于infiniteQuery是有状态的，不能重复定义，所以放在context中共享
   */
  messagesInfiniteQuery?: UseInfiniteQueryResult<
    InfiniteData<ApiResultCursorPageBaseResponseChatMessageResponse, unknown>,
    Error
  >;
  /**
   * 滚动到指定消息
   * @param messageId 消息ID
   */
  scrollToGivenMessage?: (messageId: number) => void;
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
  messagesInfiniteQuery: undefined,
  scrollToGivenMessage: undefined,
});
