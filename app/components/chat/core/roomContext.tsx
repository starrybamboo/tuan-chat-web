// src/context/chat-context.tsx
import type {
  ChatMessageResponse,
  SpaceMember,
  UserRole,
} from "../../../../api";
import type { UseChatHistoryReturn } from "@/components/chat/infra/indexedDB/useChatHistory";
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

  /** 当前激活的空间ID */
  spaceId?: number;

  /** 是否使用聊天气泡样式显示消息 */
  useChatBubbleStyle?: boolean;

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

  /**
   * 更新消息渲染设置并在 WebGAL 中重新渲染跳转
   * @param message 已更新的消息（包含最新的 voiceRenderSettings）
   * @param regenerateTTS 是否重新生成 TTS（当情感向量变化时设为 true）
   * @returns Promise<是否操作成功>
   */
  updateAndRerenderMessageInWebGAL?: (message: ChatMessageResponse, regenerateTTS?: boolean) => Promise<boolean>;

  /**
   * 在 WebGAL 中按给定顺序重建历史消息（用于“移动消息/重排顺序”等需要改变脚本行顺序的场景）
   * @param messages 可选，默认使用当前消息列表
   * @returns Promise<是否操作成功>
   */
  rerenderHistoryInWebGAL?: (messages?: ChatMessageResponse[]) => Promise<boolean>;
}

export const RoomContext = createContext<RoomContextType>({
  roomId: undefined,
  roomMembers: [],
  curMember: undefined,
  roomRolesThatUserOwn: [],
  curAvatarId: undefined,
  curRoleId: undefined,
  spaceId: undefined,
  chatHistory: undefined,
  scrollToGivenMessage: undefined,
  jumpToMessageInWebGAL: undefined,
  updateAndRerenderMessageInWebGAL: undefined,
  rerenderHistoryInWebGAL: undefined,
});
