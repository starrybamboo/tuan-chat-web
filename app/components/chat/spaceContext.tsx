import { createContext } from "react";

export interface SpaceContextType {
  /** 当前激活的空间ID */
  spaceId?: number;

  /** 当前空间的规则ID */
  ruleId?: number;

  /** 标识当前用户是否为空间所有者 */
  isSpaceOwner?: boolean;

  /**
   * 设置激活空间ID的回调函数
   */
  setActiveSpaceId: (id: number | null) => void;

  /**
   * 设置激活房间ID的回调函数
   */
  setActiveRoomId: (id: number | null) => void;

  /**
   * 开启左侧侧边栏的回调函数
   */
  toggleLeftDrawer: () => void;
}

export const SpaceContext = createContext<SpaceContextType>({
  spaceId: undefined,
  isSpaceOwner: false,
  setActiveSpaceId: () => {},
  setActiveRoomId: () => {},
  ruleId: undefined,
  toggleLeftDrawer: () => {},
});
