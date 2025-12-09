import type { UseChatHistoryReturn } from "@/components/chat/indexedDB/useChatHistory";
// src/context/chat-context.tsx
import type React from "react";
import type {
  ChatMessageResponse,
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
   * key: roleId, value: "left" | "center" | "right" | undefined
   * undefined 表示不显示立绘
   */
  defaultFigurePositionMap?: Record<number, "left" | "center" | "right" | undefined>;

  /**
   * 设置角色默认立绘位置
   * position 为 undefined 时表示不显示立绘
   */
  setDefaultFigurePosition?: (roleId: number, position: "left" | "center" | "right" | undefined) => void;

  /**
   * 自动回复模式（每次发送消息时自动回复最后一条消息）
   */
  autoReplyMode?: boolean;

  /**
   * 设置自动回复模式
   */
  setAutoReplyMode?: (mode: boolean) => void;

  /**
   * 更新消息渲染设置并在 WebGAL 中重新渲染跳转
   * @param message 已更新的消息（包含最新的 voiceRenderSettings）
   * @param regenerateTTS 是否重新生成 TTS（当情感向量变化时设为 true）
   * @returns Promise<是否操作成功>
   */
  updateAndRerenderMessageInWebGAL?: (message: ChatMessageResponse, regenerateTTS?: boolean) => Promise<boolean>;

  /**
   * 在指定消息下方插入新消息
   * 当此值不为 undefined 时，下一条发送的消息将被插入到该消息下方
   */
  insertAfterMessageId?: number;

  /**
   * 设置插入位置
   * @param messageId 要在其下方插入的消息ID，传 undefined 取消插入模式
   */
  setInsertAfterMessageId?: (messageId: number | undefined) => void;
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
  updateAndRerenderMessageInWebGAL: undefined,
  insertAfterMessageId: undefined,
  setInsertAfterMessageId: undefined,
});
