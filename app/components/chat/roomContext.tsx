import type { UseChatHistoryReturn } from "@/components/chat/indexedDB/useChatHistory";
// src/context/chat-context.tsx
import type React from "react";
import type {
  Message,
  SpaceMember,
  UserRole,
} from "../../../api";

import { createContext } from "react";

export interface RoomContextType {
  /** 当前激活的群组ID */
  roomId?: number;

  /** 房间成员列表 */
  roomMembers: SpaceMember[];

  /** 当前登录用户对应的成员信息 */
  curMember?: SpaceMember;

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
   * 历史消息
   */
  chatHistory?: UseChatHistoryReturn;

  /**
   * 滚动到指定消息
   * @param messageId 消息ID
   */
  scrollToGivenMessage?: (messageId: number) => void;

  /**
   * 在 WebGAL 中跳转到指定消息
   * @param messageId 消息ID
   * @returns 是否跳转成功
   */
  jumpToMessageInWebGAL?: (messageId: number) => boolean;

  /**
   * WebGAL 联动模式
   * 开启后会在消息气泡中显示立绘位置、情感等设置
   */
  webgalLinkMode?: boolean;

  /**
   * 设置 WebGAL 联动模式
   */
  setWebgalLinkMode?: (mode: boolean) => void;

  /**
   * 角色默认立绘位置 Map
   * key: roleId, value: "left" | "center" | "right"
   */
  defaultFigurePositionMap?: Record<number, "left" | "center" | "right">;

  /**
   * 设置角色默认立绘位置
   */
  setDefaultFigurePosition?: (roleId: number, position: "left" | "center" | "right") => void;

  /**
   * 自动回复模式（每次发送消息时自动回复最后一条消息）
   */
  autoReplyMode?: boolean;

  /**
   * 设置自动回复模式
   */
  setAutoReplyMode?: (mode: boolean) => void;
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
  chatHistory: undefined,
  scrollToGivenMessage: undefined,
  jumpToMessageInWebGAL: undefined,
  webgalLinkMode: false,
  setWebgalLinkMode: undefined,
  defaultFigurePositionMap: {},
  setDefaultFigurePosition: undefined,
  autoReplyMode: false,
  setAutoReplyMode: undefined,
});
